#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { homedir, tmpdir } from 'os';

// Set up debug mode
const DEBUG = process.env.DEBUG === 'true';

// Set up debug logging
const debugLog = (message: string) => {
  if (!DEBUG) return;
  try {
    // Use os.tmpdir() for platform-independent temporary directory
    const logPath = path.join(tmpdir(), 'mcp-brain-debug.log');
    fs.appendFileSync(logPath, `${new Date().toISOString()} - ${message}\n`);
  } catch (err) {
    if (DEBUG) {
      console.error('Failed to write to debug log:', err);
    }
  }
};

interface Entity {
  name: string;
  entity_type: string;
  observations: string[];
  created_at?: string;
  updated_at?: string;
}

interface Relation {
  from: string;
  to: string;
  relation_type: string;
  created_at?: string;
  updated_at?: string;
}

class BrainServer {
  private server: Server;
  private supabase: SupabaseClient;

  constructor() {
    // Ensure environment variables are defined
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_KEY environment variables are required');
    }

    this.server = new Server(
      {
        name: 'mcp-brain',
        version: '0.1.0',
        description: 'A cognitive memory system that helps the model remember and reason about past interactions',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize Supabase client
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    debugLog('Initialized Supabase client');

    this.setupToolHandlers();

    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async initialize() {
    // Initialize database tables
    await this.initDatabase();
    debugLog('Initialized database tables');

    // Connect server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    debugLog('Brain MCP server running on stdio');
  }

  private async initDatabase() {
    try {
      // Create locks table if it doesn't exist
      await this.supabase.rpc('init_database');
      debugLog('Database initialization successful');
    } catch (error) {
      // If the function doesn't exist, create the tables directly
      if ((error as any)?.message?.includes('Could not find the function')) {
        const { error: tableError } = await this.supabase
          .from('locks')
          .select('*')
          .limit(1);

        // If locks table doesn't exist, create all tables
        if (tableError?.code === '42P01') {
          debugLog('Creating database tables');
          await this.supabase.rpc('create_tables', {
            sql: `
              CREATE TABLE IF NOT EXISTS locks (
                id TEXT PRIMARY KEY,
                acquired_at TIMESTAMP WITH TIME ZONE NOT NULL,
                locked_by TEXT NOT NULL
              );

              CREATE TABLE IF NOT EXISTS entities (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                entity_type TEXT NOT NULL,
                observations TEXT[] DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
              );

              CREATE TABLE IF NOT EXISTS relations (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                "from" TEXT NOT NULL REFERENCES entities(name) ON DELETE CASCADE,
                "to" TEXT NOT NULL REFERENCES entities(name) ON DELETE CASCADE,
                relation_type TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE("from", "to", relation_type)
              );
            `
          });
          debugLog('Database tables created successfully');
        }
      } else {
        console.error('Failed to initialize database:', error);
        throw error;
      }
    }
  }

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const lockId = 'memory_lock';
    const maxRetries = 10;
    const retryDelay = 1000; // 1 second
    const lockTimeout = 30000; // 30 seconds

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Clear any stale locks
        const { data: locks } = await this.supabase
          .from('locks')
          .select('*')
          .eq('id', lockId)
          .single();

        if (locks) {
          const acquiredAt = new Date(locks.acquired_at).getTime();
          const now = Date.now();
          if (now - acquiredAt > lockTimeout) {
            debugLog(`Clearing stale lock from ${locks.locked_by}`);
            await this.supabase
              .from('locks')
              .delete()
              .eq('id', lockId);
          }
        }

        // Try to acquire lock
        const { error: lockError } = await this.supabase
          .from('locks')
          .upsert({
            id: lockId,
            acquired_at: new Date().toISOString(),
            locked_by: `${process.pid}-${Date.now()}`
          }, {
            onConflict: 'id'
          });

        if (!lockError) {
          try {
            // Execute operation while holding lock
            return await operation();
          } finally {
            // Release lock
            await this.supabase
              .from('locks')
              .delete()
              .eq('id', lockId);
          }
        }

        // Lock is held, wait and retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } catch (error) {
        debugLog(`Lock error: ${error}`);
        throw error;
      }
    }

    throw new Error('Failed to acquire lock after maximum retries');
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'read_graph',
          description: 'Read the brain\'s entire memory graph to recall past interactions and knowledge',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'create_entities',
          description: 'Store new memories as entities in the brain\'s knowledge graph',
          inputSchema: {
            type: 'object',
            properties: {
              entities: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    entity_type: { type: 'string' },
                    observations: {
                      type: 'array',
                      items: { type: 'string' }
                    },
                  },
                  required: ['name', 'entity_type', 'observations'],
                },
              },
            },
            required: ['entities'],
          },
        },
        {
          name: 'create_relations',
          description: 'Create connections between memories in the brain\'s knowledge graph',
          inputSchema: {
            type: 'object',
            properties: {
              relations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    from: { type: 'string' },
                    to: { type: 'string' },
                    relation_type: { type: 'string' },
                  },
                  required: ['from', 'to', 'relation_type'],
                },
              },
            },
            required: ['relations'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name } = request.params;

        switch (name) {
          case 'read_graph': {
            return await this.withLock(async () => {
              const { data: entities, error: entitiesError } = await this.supabase
                .from('entities')
                .select('*');

              if (entitiesError) throw entitiesError;

              const { data: relations, error: relationsError } = await this.supabase
                .from('relations')
                .select('*');

              if (relationsError) throw relationsError;

              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify({ entities, relations }, null, 2)
                }],
              };
            });
          }

          case 'create_entities': {
            const { entities } = request.params.arguments as { entities: Entity[] };
            return await this.withLock(async () => {
              const { data, error } = await this.supabase
                .from('entities')
                .insert(entities)
                .select();

              if (error) throw error;

              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify(data, null, 2)
                }],
              };
            });
          }

          case 'create_relations': {
            const { relations } = request.params.arguments as { relations: Relation[] };
            return await this.withLock(async () => {
              const { data, error } = await this.supabase
                .from('relations')
                .insert(relations)
                .select();

              if (error) throw error;

              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify(data, null, 2)
                }],
              };
            });
          }
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error: unknown) {
        console.error('[Tool Error]', error);
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text', text: `Error: ${message}` }],
          isError: true,
        };
      }
    });
  }

  async run() {
    await this.initialize();
  }
}

const server = new BrainServer();
server.run().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

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
    const logPath = path.join(tmpdir(), 'supabase-memory-debug.log');
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

class SupabaseMemoryServer {
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
        name: 'supabase-memory',
        version: '1.0.0',
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
          description: 'Read the entire knowledge graph',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'create_entities',
          description: 'Create multiple new entities in the knowledge graph',
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
          description: 'Create multiple new relations between entities',
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
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    debugLog('Supabase Memory MCP server running on stdio');
  }
}

const server = new SupabaseMemoryServer();
server.run().catch(console.error);

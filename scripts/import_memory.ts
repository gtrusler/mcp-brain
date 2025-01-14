#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as readline from 'readline';

// Get environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface Entity {
  name: string;
  entity_type: string;
  observations: string[];
}

interface Relation {
  from: string;
  to: string;
  relation_type: string;
}

interface MemoryEntry {
  type: 'entity' | 'relation';
  name?: string;
  entityType?: string;
  observations?: string[];
  from?: string;
  to?: string;
  relationType?: string;
}

async function importMemory(filePath: string) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const entities: Entity[] = [];
  const relations: Relation[] = [];
  let lineNumber = 0;

  console.log('Reading memory file...');

  for await (const line of rl) {
    lineNumber++;
    try {
      const entry: MemoryEntry = JSON.parse(line);

      if (entry.type === 'entity') {
        if (!entry.name || !entry.entityType || !entry.observations) {
          console.warn(`Warning: Skipping invalid entity at line ${lineNumber}`);
          continue;
        }
        entities.push({
          name: entry.name,
          entity_type: entry.entityType,
          observations: entry.observations
        });
      } else if (entry.type === 'relation') {
        if (!entry.from || !entry.to || !entry.relationType) {
          console.warn(`Warning: Skipping invalid relation at line ${lineNumber}`);
          continue;
        }
        relations.push({
          from: entry.from,
          to: entry.to,
          relation_type: entry.relationType
        });
      }
    } catch (error) {
      console.error(`Error parsing line ${lineNumber}:`, error);
    }
  }

  console.log(`Found ${entities.length} entities and ${relations.length} relations`);

  // Import entities in batches
  const BATCH_SIZE = 50;
  console.log('\nImporting entities...');
  for (let i = 0; i < entities.length; i += BATCH_SIZE) {
    const batch = entities.slice(i, i + BATCH_SIZE);
    try {
      for (const e of batch) {
        try {
          // Try to update existing entity, or insert if not exists
          const { error } = await supabase.rpc('upsert_entity', {
            p_name: e.name,
            p_entity_type: e.entity_type,
            p_observations: e.observations
          });

          if (error) {
            console.warn(`Error upserting entity ${e.name}:`, error);
          }
        } catch (error) {
          console.error(`Fatal error upserting entity ${e.name}:`, error);
        }
      }
      console.log(`Imported entities ${i + 1} to ${Math.min(i + BATCH_SIZE, entities.length)}`);
    } catch (error) {
      console.error(`Error importing entities batch ${i + 1} to ${Math.min(i + BATCH_SIZE, entities.length)}:`, error);
    }
  }

  // Import relations in batches
  console.log('\nImporting relations...');
  for (let i = 0; i < relations.length; i += BATCH_SIZE) {
    const batch = relations.slice(i, i + BATCH_SIZE);
    try {
      for (const r of batch) {
        try {
          // Use RPC to handle relation upsert with entity creation
          const { error } = await supabase.rpc('upsert_relation', {
            p_from: r.from,
            p_to: r.to,
            p_relation_type: r.relation_type,
            p_from_type: 'unknown',
            p_to_type: 'unknown',
            p_from_observations: ['Automatically created during relation import'],
            p_to_observations: ['Automatically created during relation import']
          });

          if (error) {
            console.warn(`Error upserting relation from ${r.from} to ${r.to}:`, error);
          }
        } catch (error) {
          console.error(`Fatal error upserting relation from ${r.from} to ${r.to}:`, error);
        }
      }
      console.log(`Imported relations ${i + 1} to ${Math.min(i + BATCH_SIZE, relations.length)}`);
    } catch (error) {
      console.error(`Error importing relations batch ${i + 1} to ${Math.min(i + BATCH_SIZE, relations.length)}:`, error);
    }
  }

  console.log('\nImport complete!');
}

// Get file path from command line argument
const filePath = process.argv[2] || 'memory/memory.jsonl';

// Run the import
importMemory(filePath).catch(error => {
  console.error('Import failed:', error);
  process.exit(1);
});

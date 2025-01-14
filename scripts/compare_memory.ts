#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import * as fs from 'fs';

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

interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}

async function getSupabaseMemory(): Promise<KnowledgeGraph> {
  const { data: entities, error: entitiesError } = await supabase
    .from('entities')
    .select('*');

  if (entitiesError) throw entitiesError;

  const { data: relations, error: relationsError } = await supabase
    .from('relations')
    .select('*');

  if (relationsError) throw relationsError;

  return {
    entities: entities || [],
    relations: relations || []
  };
}

function getMcpMemory(): KnowledgeGraph {
  try {
    // Read and parse the JSONL file
    const lines = fs.readFileSync('memory/memory.jsonl', 'utf-8').split('\n').filter(Boolean);
    const entities: Entity[] = [];
    const relations: Relation[] = [];

    lines.forEach((line: string) => {
      const entry = JSON.parse(line);
      if (entry.type === 'entity') {
        entities.push({
          name: entry.name,
          entity_type: entry.entityType,
          observations: entry.observations
        });
      } else if (entry.type === 'relation') {
        relations.push({
          from: entry.from,
          to: entry.to,
          relation_type: entry.relationType
        });
      }
    });

    return { entities, relations };
  } catch (error) {
    console.error('Failed to get MCP memory:', error);
    throw error;
  }
}

function compareEntities(supabaseEntities: Entity[], mcpEntities: Entity[]) {
  const supabaseMap = new Map(supabaseEntities.map(e => [e.name, e]));
  const mcpMap = new Map(mcpEntities.map(e => [e.name, e]));

  // Find entities only in Supabase
  const onlyInSupabase = supabaseEntities.filter(e => !mcpMap.has(e.name));

  // Find entities only in MCP
  const onlyInMcp = mcpEntities.filter(e => !supabaseMap.has(e.name));

  // Find entities with different content
  const different = supabaseEntities.filter(se => {
    const me = mcpMap.get(se.name);
    if (!me) return false;
    return (
      se.entity_type !== me.entity_type ||
      JSON.stringify(se.observations.sort()) !== JSON.stringify(me.observations.sort())
    );
  });

  return { onlyInSupabase, onlyInMcp, different };
}

function compareRelations(supabaseRelations: Relation[], mcpRelations: Relation[]) {
  const normalizeRelation = (r: Relation) => `${r.from}|${r.to}|${r.relation_type}`;
  const supabaseSet = new Set(supabaseRelations.map(normalizeRelation));
  const mcpSet = new Set(mcpRelations.map(normalizeRelation));

  const onlyInSupabase = supabaseRelations.filter(r => !mcpSet.has(normalizeRelation(r)));
  const onlyInMcp = mcpRelations.filter(r => !supabaseSet.has(normalizeRelation(r)));

  return { onlyInSupabase, onlyInMcp };
}

async function compareMemory() {
  console.log('Fetching memory from both sources...');

  const [supabaseMemory, mcpMemory] = [
    await getSupabaseMemory(),
    getMcpMemory()
  ];

  console.log('\nCounts:');
  console.log('Supabase:', {
    entities: supabaseMemory.entities.length,
    relations: supabaseMemory.relations.length
  });
  console.log('MCP:', {
    entities: mcpMemory.entities.length,
    relations: mcpMemory.relations.length
  });

  console.log('\nComparing entities...');
  const entityComparison = compareEntities(supabaseMemory.entities, mcpMemory.entities);

  if (entityComparison.onlyInSupabase.length > 0) {
    console.log('\nEntities only in Supabase:');
    entityComparison.onlyInSupabase.forEach(e => {
      console.log(`- ${e.name} (${e.entity_type})`);
    });
  }

  if (entityComparison.onlyInMcp.length > 0) {
    console.log('\nEntities only in MCP:');
    entityComparison.onlyInMcp.forEach(e => {
      console.log(`- ${e.name} (${e.entity_type})`);
    });
  }

  if (entityComparison.different.length > 0) {
    console.log('\nEntities with differences:');
    entityComparison.different.forEach(e => {
      const mcpEntity = mcpMemory.entities.find(me => me.name === e.name);
      console.log(`\n${e.name}:`);
      if (e.entity_type !== mcpEntity?.entity_type) {
        console.log(`  Type: ${mcpEntity?.entity_type} -> ${e.entity_type}`);
      }
      const mcpObs = new Set(mcpEntity?.observations || []);
      const supabaseObs = new Set(e.observations);
      const onlyInSupabase = [...supabaseObs].filter(o => !mcpObs.has(o));
      const onlyInMcp = [...mcpObs].filter(o => !supabaseObs.has(o));
      if (onlyInSupabase.length > 0) {
        console.log('  Added observations:', onlyInSupabase);
      }
      if (onlyInMcp.length > 0) {
        console.log('  Missing observations:', onlyInMcp);
      }
    });
  }

  console.log('\nComparing relations...');
  const relationComparison = compareRelations(supabaseMemory.relations, mcpMemory.relations);

  if (relationComparison.onlyInSupabase.length > 0) {
    console.log('\nRelations only in Supabase:');
    relationComparison.onlyInSupabase.forEach(r => {
      console.log(`- ${r.from} ${r.relation_type} ${r.to}`);
    });
  }

  if (relationComparison.onlyInMcp.length > 0) {
    console.log('\nRelations only in MCP:');
    relationComparison.onlyInMcp.forEach(r => {
      console.log(`- ${r.from} ${r.relation_type} ${r.to}`);
    });
  }

  console.log('\nComparison complete!');
}

// Run the comparison
compareMemory().catch(error => {
  console.error('Comparison failed:', error);
  process.exit(1);
});

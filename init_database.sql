-- Function to initialize all required tables
CREATE OR REPLACE FUNCTION init_database()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Create locks table if it doesn't exist
    CREATE TABLE IF NOT EXISTS locks (
        id TEXT PRIMARY KEY,
        acquired_at TIMESTAMP WITH TIME ZONE NOT NULL,
        locked_by TEXT NOT NULL
    );

    -- Create entities table if it doesn't exist
    CREATE TABLE IF NOT EXISTS entities (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        entity_type TEXT NOT NULL,
        observations TEXT[] DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create relations table if it doesn't exist
    CREATE TABLE IF NOT EXISTS relations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "from" TEXT NOT NULL REFERENCES entities(name) ON DELETE CASCADE,
        "to" TEXT NOT NULL REFERENCES entities(name) ON DELETE CASCADE,
        relation_type TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        -- Ensure no duplicate relations between the same entities
        UNIQUE("from", "to", relation_type)
    );

    -- Create function to update timestamps
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Create triggers for updating timestamps
    DROP TRIGGER IF EXISTS update_entities_updated_at ON entities;
    CREATE TRIGGER update_entities_updated_at
        BEFORE UPDATE ON entities
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_relations_updated_at ON relations;
    CREATE TRIGGER update_relations_updated_at
        BEFORE UPDATE ON relations
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
END;
$$;

-- Function to upsert entities
CREATE OR REPLACE FUNCTION upsert_entity(
  p_name TEXT,
  p_entity_type TEXT,
  p_observations TEXT[]
) RETURNS VOID AS $$
BEGIN
  INSERT INTO entities (name, entity_type, observations)
  VALUES (p_name, p_entity_type, p_observations)
  ON CONFLICT (name) DO UPDATE
  SET
    entity_type = EXCLUDED.entity_type,
    observations = EXCLUDED.observations,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to upsert relations
CREATE OR REPLACE FUNCTION upsert_relation(
  p_from TEXT,
  p_to TEXT,
  p_relation_type TEXT,
  p_from_type TEXT DEFAULT 'unknown',
  p_to_type TEXT DEFAULT 'unknown',
  p_from_observations TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_to_observations TEXT[] DEFAULT ARRAY[]::TEXT[]
) RETURNS VOID AS $$
BEGIN
  -- Upsert from entity if not exists
  INSERT INTO entities (name, entity_type, observations)
  VALUES (p_from, p_from_type, p_from_observations)
  ON CONFLICT (name) DO NOTHING;

  -- Upsert to entity if not exists
  INSERT INTO entities (name, entity_type, observations)
  VALUES (p_to, p_to_type, p_to_observations)
  ON CONFLICT (name) DO NOTHING;

  -- Upsert relation
  INSERT INTO relations ("from", "to", relation_type)
  VALUES (p_from, p_to, p_relation_type)
  ON CONFLICT ("from", "to", relation_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

# Supabase Memory MCP Server

An MCP server that provides memory/knowledge graph storage capabilities using Supabase. This server enables multiple Claude instances to safely share and maintain a knowledge graph by implementing database-level locking.

## Features

- Entity and relation storage with observations
- Automatic database initialization
- Concurrent access safety through locking mechanism
- Automatic timestamps for all records
- Full text search capabilities
- Cascading deletes for relations

## Quick Install

Ask Claude to install this MCP server by saying:
```
Install the MCP server from https://github.com/gtrusler/supabase-memory-mcp.git
```

Claude will:
1. Clone the repository
2. Install dependencies
3. Build the project
4. Configure the MCP server for VSCode
5. Ask if you have Claude Desktop installed
6. If yes, configure the server for Desktop as well
7. Share the same memory across both environments

## Manual Setup

1. Create a new Supabase project at https://supabase.com

2. Install the server:
   ```bash
   # Clone the repository
   git clone https://github.com/gtrusler/supabase-memory-mcp.git
   cd supabase-memory-mcp

   # Install dependencies and build
   npm install
   npm run build
   ```

3. Configure the MCP server in your Claude settings:

   ### Local Machine (macOS)
   - VSCode: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
   - Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`

   ### Remote VPS (Linux)
   - VSCode: `~/.vscode-server/data/Machine/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

   Add the following configuration (adjust paths based on environment):
   ```json
   {
     "mcpServers": {
       "supabase-memory": {
         "command": "node",
         "args": ["/absolute/path/to/supabase-memory-mcp/dist/index.js"],
         "env": {
           "SUPABASE_URL": "your-project-url",
           "SUPABASE_KEY": "your-service-role-key",
           "DEBUG": "false"
         }
       }
     }
   }
   ```

4. Multi-Environment Setup:
   - The same Supabase database can be accessed from all environments
   - Local machine (VSCode + Desktop)
   - Remote VPS (VSCode)
   - All instances will share the same knowledge graph
   - Locking mechanism ensures safe concurrent access

## Environment Support

The server automatically adapts to different environments:
- Works on macOS and Linux
- Supports VSCode and Desktop installations
- Uses platform-appropriate paths
- Shares memory across all environments

4. The server will automatically:
   - Create all required database tables
   - Set up proper relationships and constraints
   - Configure automatic timestamp updates
   - Initialize the locking mechanism

## Verification

After installation, you can verify the setup:

1. Restart any running Claude applications
2. Ask Claude "Who am I?"
3. If the response includes your personal information, the memory system is working correctly

## Debugging

If needed, you can enable debug mode by setting `DEBUG=true` in your MCP configuration file:
- VSCode: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`

## Database Schema

### Entities
- `id`: UUID (primary key)
- `name`: Text (unique)
- `entity_type`: Text
- `observations`: Text[]
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Relations
- `id`: UUID (primary key)
- `from`: Text (references entities.name)
- `to`: Text (references entities.name)
- `relation_type`: Text
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Locks
- `id`: Text (primary key)
- `acquired_at`: Timestamp
- `locked_by`: Text

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

## Importing Existing Memory

The server includes a script to import existing memory from a JSONL file:

```bash
# Import from default location (memory/memory.jsonl)
npm run import-memory

# Import from custom location
npm run import-memory -- path/to/memory.jsonl
```

The import process:
1. Reads entities and relations from the JSONL file
2. Imports data in batches to prevent memory issues
3. Maintains relationships between entities
4. Preserves all observations and metadata

## Concurrent Access

The server implements a robust locking mechanism that ensures safe concurrent access from multiple Claude instances:

1. Lock Management:
   - Each operation first attempts to acquire a lock
   - If the lock is held, it retries up to 10 times with 1-second delays
   - After the operation completes, the lock is automatically released
   - A finally block ensures locks are always released, even if operations fail

2. Stale Lock Protection:
   - Locks automatically expire after 30 seconds
   - System checks for and clears stale locks before each operation
   - Prevents deadlocks if a process crashes or fails to release its lock
   - Debug logging tracks lock acquisitions and releases

This allows multiple Claude instances to safely share the same database without conflicts or data corruption, while ensuring the system can recover from any lock-related issues.

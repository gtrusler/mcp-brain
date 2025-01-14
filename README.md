# MCP Brain

A cognitive memory system implemented as an MCP server that stores data in Supabase. It provides persistent storage for knowledge graphs with support for entities and relations.

## Features

- Persistent storage using Supabase
- Knowledge graph structure with entities and relations
- Database-level locking for safe concurrent access
- Cross-platform support (macOS, Linux, Windows)
- Automatic table initialization
- Debug logging support

## Prerequisites

- Node.js and npm
- VSCode with Claude extension
- One of the following:
  - A new Supabase account and project (for primary installation)
  - Supabase credentials from an existing installation (for secondary installations)

## Installation Types

Choose the appropriate installation type:

1. **Primary Installation**: Set up mcp-brain with a new Supabase project. This is for the first machine that will use the brain.

2. **Secondary Installation**: Install mcp-brain on additional machines using the same Supabase database. This allows multiple machines to share the same knowledge graph.

## Installation

The installation process involves building the project and configuring it with your Supabase credentials. You can do this either automatically using the provided script, or manually.

### Primary Installation

For your first installation of mcp-brain:

1. Create a new Supabase project at https://supabase.com
2. Get your project URL and API key from Project Settings > API
3. Follow either the automated or manual installation steps below
4. Save your Supabase credentials for use in secondary installations

### Secondary Installation

For installing mcp-brain on additional machines:

1. Get the Supabase URL and API key from your primary installation
2. Follow either the automated or manual installation steps below
3. Use the same credentials to ensure all instances share the same knowledge graph

### Option A: Automated Installation

1. Clone and build the project:
   ```bash
   git clone https://github.com/gtrusler/mcp-brain.git
   cd mcp-brain
   npm install
   npm run build
   ```

2. Run the configuration script:
   ```bash
   npm run configure
   ```
   You will be prompted to enter your Supabase URL and API key. The script will automatically:
   - Create or update the MCP settings file for your OS
   - Configure the correct paths to the built files
   - Preserve any existing MCP server configurations

### Option B: Manual Installation

1. Clone and build the project:
   ```bash
   git clone https://github.com/gtrusler/mcp-brain.git
   cd mcp-brain
   npm install
   npm run build
   ```

2. Locate your MCP settings file:
   - macOS: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
   - Linux: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
   - Windows: `%APPDATA%/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

3. Add or update the mcp-brain configuration in the settings file:
   ```json
   {
     "mcpServers": {
       "mcp-brain": {
         "command": "node",
         "args": ["path/to/mcp-brain/dist/index.js"],
         "env": {
           "SUPABASE_URL": "your-project-url",
           "SUPABASE_KEY": "your-api-key",
           "DEBUG": "false"
         }
       }
     }
   }
   ```
   Replace:
   - `path/to/mcp-brain` with the absolute path to where you cloned and built the repository
   - `your-project-url` with your Supabase project URL
   - `your-api-key` with your Supabase API key

   Note: If the settings file already exists, make sure to preserve any existing MCP server configurations. Only add or update the mcp-brain section within the mcpServers object.

Your Supabase credentials can be found in your Supabase project settings under Project Settings > API.

### Applying Changes

After installation or any configuration changes:

1. If VSCode is open:
   - Close all Claude conversations
   - Run the "Developer: Reload Window" command (Cmd/Ctrl + Shift + P, then type "reload")

2. If VSCode is closed:
   - Simply start VSCode and the new configuration will be loaded automatically

### Verifying the Installation

After reloading VSCode, verify the setup by:
1. Creating a new conversation with Claude
2. Running a command like `Can you use your brain?` to test the connection
3. The brain should respond with information about its capabilities

## Usage

The brain provides three main tools through the MCP protocol:

1. `read_graph`: Read the entire knowledge graph
2. `create_entities`: Store new memories as entities
3. `create_relations`: Create connections between memories

These tools can be used through Claude to store and recall information persistently.

## Development

- `npm run build` - Build the TypeScript project
- `npm run configure` - Configure Supabase credentials
- `npm start` - Start the MCP server directly (not typically needed)

## Architecture

- Uses TypeScript and @modelcontextprotocol/sdk
- Stores data in Supabase tables:
  - entities: Nodes in the knowledge graph
  - relations: Edges connecting entities
  - locks: Database-level locking for concurrent access
- Automatic table creation on first run
- Platform-independent configuration

## License

MIT

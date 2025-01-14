# Memory Transfer Scripts

## Setup

After copying the scripts to a new machine, you need to make them executable:

```bash
chmod +x .memory/transfer.sh
chmod +x .memory/restore.sh
```

## Context Management

The last_context.md file should be regularly updated to maintain an accurate record of the current working state. Update it when:
- Starting new tasks or projects
- Making significant progress on existing tasks
- Switching between different work contexts
- Before initiating a memory transfer

The file tracks:
- Current task and recent actions
- Active projects
- Environment state
- Important notes and next steps

## Transfer Process

From the project root directory, run:

```bash
./.memory/transfer.sh
```

This will:
1. Create a timestamped backup in .memory_backup folder
2. Copy the memory file as memory.jsonl to .memory folder for transfer

Important: Before running the transfer script, ensure last_context.md is up to date with your current work state.

## Restore Process

After transferring the .memory folder to the new machine, run:

```bash
./.memory/restore.sh
```

This will:
1. Check for required files (.memory/memory.jsonl and .memory/last_context.md)
2. Update timestamps in the files
3. Copy memory.jsonl to the MCP server's build directory as memory.json
4. Set proper file permissions

Note:
- All memory files are stored in the .memory folder. Make sure to transfer the entire .memory folder between machines.
- Both transfer and restore scripts automatically detect your OS and use the appropriate MCP server path:
  * On macOS: /Users/gtrusler/Documents/Cline/MCP/servers/src/memory/dist/
  * On Linux: $HOME/Documents/Cline/MCP/memory-server/build/
- The transfer process copies memory.json from the MCP server and saves it as memory.jsonl for transfer
- The restore process copies memory.jsonl back to the MCP server as memory.json
- You may need to restart your MCP server after restore for changes to take effect

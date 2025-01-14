#!/bin/bash

# Get timestamp for versioned backup
timestamp=$(date +%Y%m%d_%H%M%S)

# Create .memory_backup directory if it doesn't exist
mkdir -p .memory_backup

# Determine OS and set MCP server location accordingly
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS path
    MCP_MEMORY_DIR="/Users/gtrusler/Documents/Cline/MCP/servers/src/memory/dist"
else
    # Linux path
    MCP_MEMORY_DIR="$HOME/Documents/Cline/MCP/memory-server/build"
fi

# Check if directory exists
if [ ! -d "$MCP_MEMORY_DIR" ]; then
    echo "Error: MCP memory server directory not found at $MCP_MEMORY_DIR"
    echo "Current OS: $OSTYPE"
    exit 1
fi

# Create timestamped backup
cp "$MCP_MEMORY_DIR/memory.json" ".memory_backup/memory_${timestamp}.json"

# Copy memory file to .memory as memory.jsonl for transfer
cp "$MCP_MEMORY_DIR/memory.json" .memory/memory.jsonl

echo "Memory transfer preparation complete:"
echo "1. Created backup: .memory_backup/memory_${timestamp}.json"
echo "2. Created transfer file: .memory/memory.jsonl"

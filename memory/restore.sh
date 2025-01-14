#!/bin/bash

# Memory Restoration Script
# This script restores memory state in a new environment

echo "Starting memory restoration..."

# Check if required files exist
if [ ! -f ".memory/memory.jsonl" ]; then
    echo "Error: .memory/memory.jsonl not found"
    exit 1
fi

if [ ! -f ".memory/last_context.md" ]; then
    echo "Error: .memory/last_context.md not found"
    exit 1
fi

# Update timestamp in memory.jsonl
current_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
sed -i '' "s/\"timestamp\":\"[^\"]*\"/\"timestamp\":\"$current_timestamp\"/" .memory/memory.jsonl

# Update timestamp in last_context.md
sed -i '' "s/^## Last Updated.*/## Last Updated\n$current_timestamp/" .memory/last_context.md

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

# Copy and convert to memory.json
cp .memory/memory.jsonl "$MCP_MEMORY_DIR/memory.json"

# Ensure proper permissions
chmod 644 "$MCP_MEMORY_DIR/memory.json"

echo "Memory state restored successfully"
echo "Timestamp updated to: $current_timestamp"
echo "Memory file copied to MCP server at: $MCP_MEMORY_DIR/memory.json"

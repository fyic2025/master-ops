# Knowledge Base MCP Server

An MCP server that ingests YouTube video content about n8n and Claude Code, processes it with Claude AI, and serves it as queryable knowledge for your development workflow.

## Features

- **YouTube Video Ingestion**: Extract transcripts from YouTube videos
- **AI-Powered Processing**: Claude analyzes and structures the content
- **Categorized Knowledge**: Organize by n8n, Claude Code, or integrations
- **MCP Integration**: Query knowledge directly from Claude Code
- **Structured Storage**: Markdown files + JSON metadata

## Setup

### 1. Install Dependencies

```bash
cd knowledge-mcp-server
npm install
```

### 2. Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
```

Add your Anthropic API key to `.env`:

```
ANTHROPIC_API_KEY=your_actual_api_key_here
```

### 3. Build the MCP Server

```bash
npm run build
```

### 4. Add to Claude Desktop Config

Add this entry to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "knowledge-base": {
      "command": "node",
      "args": [
        "C:/Users/jayso/AppData/Roaming/Claude/master-ops/knowledge-mcp-server/dist/index.js"
      ]
    }
  }
}
```

Restart Claude Desktop to load the MCP server.

## Usage

### Ingesting Videos

To add knowledge from a YouTube video:

```bash
npm run ingest -- "https://youtube.com/watch?v=VIDEO_ID" <category> "Optional Title"
```

**Categories:**
- `n8n` - n8n workflow automation content
- `claude-code` - Claude Code features and patterns
- `integrations` - Integration patterns and best practices

**Examples:**

```bash
# Ingest an n8n workflow tutorial
npm run ingest -- "https://youtube.com/watch?v=example" n8n "Advanced Error Handling"

# Ingest Claude Code best practices
npm run ingest -- "https://youtube.com/watch?v=example" claude-code "MCP Server Development"

# Ingest integration patterns
npm run ingest -- "https://youtube.com/watch?v=example" integrations "HubSpot API Patterns"
```

### Querying Knowledge (via MCP)

Once the MCP server is configured, you can use these tools in Claude Code:

1. **search_knowledge** - Search for specific patterns or techniques
   ```
   Query: "error handling patterns"
   Category: "n8n" (optional)
   ```

2. **get_latest_knowledge** - See recently added knowledge
   ```
   Category: "claude-code" (optional)
   Limit: 5 (optional)
   ```

3. **get_knowledge_by_tag** - Find entries by tag
   ```
   Tag: "webhooks"
   ```

4. **get_all_tags** - List all available tags

### Example Workflow

1. **Find a useful YouTube video** about n8n best practices

2. **Ingest it:**
   ```bash
   npm run ingest -- "https://youtube.com/watch?v=abc123" n8n "n8n Error Recovery Patterns"
   ```

3. **Query it later in Claude Code:**
   - Ask: "What are the latest n8n error handling patterns?"
   - Claude Code will use the `search_knowledge` tool to find relevant entries

## Knowledge Base Structure

```
knowledge-base/
├── n8n/                    # n8n-related knowledge
│   └── 2025-01-20-abc123.md
├── claude-code/            # Claude Code knowledge
│   └── 2025-01-20-def456.md
├── integrations/           # Integration patterns
│   └── 2025-01-20-ghi789.md
└── .metadata/              # JSON metadata for MCP queries
    ├── abc123.json
    ├── def456.json
    └── ghi789.json
```

## How It Works

### Ingestion Pipeline

1. **Extract Transcript**: Uses `youtube-transcript` to get video captions
2. **Process with Claude**: Sends transcript to Claude for analysis
3. **Structure Knowledge**: Extracts:
   - Summary
   - Key practices
   - Code examples
   - Tags
   - Relevant use cases
4. **Save**: Creates both markdown (human-readable) and JSON (MCP-queryable)

### MCP Server

The MCP server provides tools that:
- Load knowledge from JSON metadata
- Search across summaries, practices, tags
- Filter by category and tags
- Sort by recency
- Return structured results to Claude Code

## Tips

- **Be Selective**: Curate high-quality videos with actionable content
- **Good Titles**: Provide descriptive titles when ingesting
- **Consistent Tagging**: Claude will auto-tag, but you can review and refine
- **Regular Updates**: Ingest new videos as the ecosystem evolves
- **Search First**: Use `search_knowledge` to see if you already have relevant info

## Recommended YouTube Channels

### n8n
- n8n Official Channel
- Community tutorials on workflow automation
- Integration-specific guides

### Claude Code
- Anthropic official content
- Community showcase videos
- MCP server development guides

## Troubleshooting

### Transcript not available
Some videos don't have captions. Try a different video or wait for captions to be added.

### API Key errors
Ensure your `ANTHROPIC_API_KEY` is set in the `.env` file.

### MCP server not appearing
- Verify the path in `claude_desktop_config.json` is correct
- Check that you ran `npm run build`
- Restart Claude Desktop

## Future Enhancements

- [ ] Batch ingestion from a list of URLs
- [ ] Web scraping for blog posts and documentation
- [ ] Similarity search for finding related knowledge
- [ ] Export knowledge to different formats
- [ ] Integration with other knowledge sources

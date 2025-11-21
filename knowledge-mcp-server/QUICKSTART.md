# Quick Start Guide

## Step 1: Add Your API Key

Edit the `.env` file and add your Anthropic API key:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
```

Get your API key from: https://console.anthropic.com/

## Step 2: Restart Claude Desktop

The MCP server has been added to your config. Restart Claude Desktop to activate it.

## Step 3: Test the Ingestion

Try ingesting a YouTube video about n8n or Claude Code:

```bash
cd knowledge-mcp-server
npm run ingest -- "YOUTUBE_URL_HERE" n8n "Video Title"
```

**Example n8n videos you could ingest:**
- n8n workflow automation tutorials
- Error handling patterns
- Integration best practices

**Example Claude Code videos:**
- MCP server development
- Claude Code features
- Skill development patterns

## Step 4: Query Knowledge in Claude Code

After restarting Claude Desktop and ingesting some videos, you can query the knowledge:

### In Claude Code conversation:
- "Search the knowledge base for n8n error handling patterns"
- "What are the latest Claude Code best practices?"
- "Show me recent knowledge about webhooks"

### Direct MCP tool usage:
Claude Code will automatically use these tools when relevant:
- `search_knowledge` - Find specific patterns
- `get_latest_knowledge` - See recent additions
- `get_knowledge_by_tag` - Filter by topic
- `get_all_tags` - List all topics

## Recommended First Videos

### For n8n:
1. Official n8n tutorials on complex workflows
2. Community videos on error recovery
3. Integration-specific guides (HubSpot, Supabase, etc.)

### For Claude Code:
1. Anthropic's official Claude Code demos
2. MCP server development tutorials
3. Community skill showcases

## Workflow

1. **Discover** a useful YouTube video
2. **Ingest** it with the script
3. **Query** the knowledge during development
4. **Repeat** to build your knowledge base

## Tips

- Start with 3-5 high-quality videos in each category
- Use descriptive titles when ingesting
- Review the generated markdown files to see what was extracted
- Query often - the knowledge is most valuable when actively used

## File Locations

- **Knowledge Base**: `../knowledge-base/`
- **Markdown Files**: `../knowledge-base/n8n/`, `../knowledge-base/claude-code/`, etc.
- **Metadata**: `../knowledge-base/.metadata/`
- **Config**: `~/.config/Claude/claude_desktop_config.json` (or Windows equivalent)

## Troubleshooting

### MCP Server Not Showing
- Verify you restarted Claude Desktop
- Check the path in claude_desktop_config.json matches your installation
- Run `npm run build` again if you made changes

### Ingestion Fails
- Ensure ANTHROPIC_API_KEY is set in .env
- Check the YouTube URL has captions available
- Try a different video if transcripts aren't available

### Can't Find Knowledge
- Make sure you've ingested at least one video
- Check that files exist in `../knowledge-base/.metadata/`
- Try broader search terms

## Next Steps

Once you have the system working:
- Create a list of curated video URLs
- Set up a regular ingestion schedule
- Explore creating custom categories
- Integrate with your development workflow

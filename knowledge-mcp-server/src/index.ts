#!/usr/bin/env node
/**
 * Knowledge Base MCP Server
 *
 * Provides tools to query n8n and Claude Code knowledge base
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { z } from 'zod';

const KNOWLEDGE_BASE_DIR = join(process.cwd(), '..', 'knowledge-base');

interface KnowledgeMetadata {
  url: string;
  videoId: string;
  category: string;
  title?: string;
  ingestedAt: string;
}

interface KnowledgeEntry {
  metadata: KnowledgeMetadata;
  summary: string;
  keyPractices: string[];
  codeExamples: Array<{
    description: string;
    code: string;
    language: string;
  }>;
  tags: string[];
  relevantTo: string[];
}

async function loadAllKnowledge(): Promise<KnowledgeEntry[]> {
  const metadataDir = join(KNOWLEDGE_BASE_DIR, '.metadata');

  try {
    const files = await readdir(metadataDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const entries = await Promise.all(
      jsonFiles.map(async file => {
        const content = await readFile(join(metadataDir, file), 'utf-8');
        return JSON.parse(content) as KnowledgeEntry;
      })
    );

    return entries;
  } catch (error) {
    console.error('Error loading knowledge:', error);
    return [];
  }
}

async function searchKnowledge(
  query: string,
  category?: string
): Promise<KnowledgeEntry[]> {
  const allKnowledge = await loadAllKnowledge();
  const queryLower = query.toLowerCase();

  return allKnowledge.filter(entry => {
    // Filter by category if specified
    if (category && entry.metadata.category !== category) {
      return false;
    }

    // Search in multiple fields
    const searchFields = [
      entry.summary,
      entry.keyPractices.join(' '),
      entry.tags.join(' '),
      entry.relevantTo.join(' '),
      entry.metadata.title || '',
    ].join(' ').toLowerCase();

    return searchFields.includes(queryLower);
  });
}

async function getLatestKnowledge(
  category?: string,
  limit = 5
): Promise<KnowledgeEntry[]> {
  const allKnowledge = await loadAllKnowledge();

  let filtered = category
    ? allKnowledge.filter(e => e.metadata.category === category)
    : allKnowledge;

  // Sort by ingestion date, most recent first
  filtered.sort((a, b) => {
    return new Date(b.metadata.ingestedAt).getTime() -
           new Date(a.metadata.ingestedAt).getTime();
  });

  return filtered.slice(0, limit);
}

async function getKnowledgeByTag(tag: string): Promise<KnowledgeEntry[]> {
  const allKnowledge = await loadAllKnowledge();
  const tagLower = tag.toLowerCase();

  return allKnowledge.filter(entry =>
    entry.tags.some(t => t.toLowerCase().includes(tagLower))
  );
}

const server = new Server(
  {
    name: 'knowledge-base',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const tools: Tool[] = [
  {
    name: 'search_knowledge',
    description:
      'Search the knowledge base for n8n and Claude Code best practices. ' +
      'Use this to find specific patterns, techniques, or solutions.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "error handling", "workflow patterns")',
        },
        category: {
          type: 'string',
          enum: ['n8n', 'claude-code', 'integrations'],
          description: 'Optional: filter by category',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_latest_knowledge',
    description:
      'Get the most recently added knowledge entries. ' +
      'Use this to see what new practices or patterns have been added.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['n8n', 'claude-code', 'integrations'],
          description: 'Optional: filter by category',
        },
        limit: {
          type: 'number',
          description: 'Number of entries to return (default: 5)',
        },
      },
    },
  },
  {
    name: 'get_knowledge_by_tag',
    description:
      'Find knowledge entries by tag. ' +
      'Use this to explore specific topics or techniques.',
    inputSchema: {
      type: 'object',
      properties: {
        tag: {
          type: 'string',
          description: 'Tag to search for (e.g., "webhooks", "authentication")',
        },
      },
      required: ['tag'],
    },
  },
  {
    name: 'get_all_tags',
    description:
      'List all available tags in the knowledge base. ' +
      'Use this to discover what topics are covered.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_knowledge': {
        const { query, category } = args as {
          query: string;
          category?: string;
        };
        const results = await searchKnowledge(query, category);

        return {
          content: [
            {
              type: 'text',
              text: results.length > 0
                ? JSON.stringify(results, null, 2)
                : 'No knowledge entries found matching your query.',
            },
          ],
        };
      }

      case 'get_latest_knowledge': {
        const { category, limit } = args as {
          category?: string;
          limit?: number;
        };
        const results = await getLatestKnowledge(category, limit);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'get_knowledge_by_tag': {
        const { tag } = args as { tag: string };
        const results = await getKnowledgeByTag(tag);

        return {
          content: [
            {
              type: 'text',
              text: results.length > 0
                ? JSON.stringify(results, null, 2)
                : `No knowledge entries found with tag: ${tag}`,
            },
          ],
        };
      }

      case 'get_all_tags': {
        const allKnowledge = await loadAllKnowledge();
        const allTags = new Set<string>();

        allKnowledge.forEach(entry => {
          entry.tags.forEach(tag => allTags.add(tag));
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(Array.from(allTags).sort(), null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Knowledge Base MCP Server running on stdio');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

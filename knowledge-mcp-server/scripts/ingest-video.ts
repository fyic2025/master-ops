#!/usr/bin/env tsx
/**
 * YouTube Video Knowledge Ingestion Script
 *
 * Takes YouTube URLs, extracts transcripts, and processes them with Claude
 * to create structured knowledge base entries.
 */

import { YoutubeTranscript } from 'youtube-transcript';
import Anthropic from '@anthropic-ai/sdk';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { config } from 'dotenv';

config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface VideoMetadata {
  url: string;
  videoId: string;
  category: 'n8n' | 'claude-code' | 'integrations';
  title?: string;
  ingestedAt: string;
}

interface KnowledgeEntry {
  metadata: VideoMetadata;
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

async function extractVideoId(url: string): Promise<string> {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  throw new Error('Invalid YouTube URL');
}

async function getTranscript(videoId: string): Promise<string> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    return transcript.map(item => item.text).join(' ');
  } catch (error) {
    throw new Error(`Failed to fetch transcript: ${error}`);
  }
}

async function processWithClaude(
  transcript: string,
  category: string,
  url: string
): Promise<KnowledgeEntry> {
  const prompt = `You are processing a YouTube video transcript about ${category}.
Extract and structure the key knowledge from this video.

Transcript:
${transcript}

Please provide a structured analysis in the following JSON format:
{
  "summary": "A concise 2-3 sentence summary of the video's main points",
  "keyPractices": ["Array of key practices, patterns, or techniques discussed"],
  "codeExamples": [
    {
      "description": "What this code demonstrates",
      "code": "The actual code snippet",
      "language": "javascript/typescript/json/etc"
    }
  ],
  "tags": ["Relevant tags for categorization"],
  "relevantTo": ["Specific use cases or scenarios this knowledge applies to"]
}

Focus on actionable insights, best practices, and reusable patterns.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Extract JSON from the response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not extract JSON from Claude response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    metadata: {
      url,
      videoId: await extractVideoId(url),
      category: category as any,
      ingestedAt: new Date().toISOString(),
    },
    ...parsed,
  };
}

async function saveKnowledge(entry: KnowledgeEntry): Promise<void> {
  const baseDir = join(process.cwd(), '..', 'knowledge-base');
  const categoryDir = join(baseDir, entry.metadata.category);

  await mkdir(categoryDir, { recursive: true });

  // Create markdown file
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${timestamp}-${entry.metadata.videoId}.md`;
  const filepath = join(categoryDir, filename);

  const markdown = `# ${entry.metadata.title || 'Video Knowledge'}

**Source:** [YouTube Video](${entry.metadata.url})
**Category:** ${entry.metadata.category}
**Ingested:** ${entry.metadata.ingestedAt}
**Tags:** ${entry.tags.join(', ')}

## Summary

${entry.summary}

## Key Practices

${entry.keyPractices.map((p, i) => `${i + 1}. ${p}`).join('\n')}

## Code Examples

${entry.codeExamples.map(ex => `
### ${ex.description}

\`\`\`${ex.language}
${ex.code}
\`\`\`
`).join('\n')}

## Relevant To

${entry.relevantTo.map(r => `- ${r}`).join('\n')}
`;

  await writeFile(filepath, markdown, 'utf-8');

  // Save metadata JSON
  const metadataPath = join(
    baseDir,
    '.metadata',
    `${entry.metadata.videoId}.json`
  );
  await mkdir(join(baseDir, '.metadata'), { recursive: true });
  await writeFile(metadataPath, JSON.stringify(entry, null, 2), 'utf-8');

  console.log(`✓ Saved knowledge to ${filepath}`);
}

async function ingestVideo(
  url: string,
  category: 'n8n' | 'claude-code' | 'integrations',
  title?: string
): Promise<void> {
  console.log(`\n🎥 Processing: ${url}`);
  console.log(`📂 Category: ${category}`);

  try {
    const videoId = await extractVideoId(url);
    console.log(`📝 Extracting transcript for video: ${videoId}`);

    const transcript = await getTranscript(videoId);
    console.log(`✓ Transcript extracted (${transcript.length} characters)`);

    console.log(`🤖 Processing with Claude...`);
    const knowledge = await processWithClaude(transcript, category, url);

    if (title) {
      knowledge.metadata.title = title;
    }

    await saveKnowledge(knowledge);
    console.log(`✅ Successfully ingested knowledge from ${url}`);
  } catch (error) {
    console.error(`❌ Error processing video: ${error}`);
    throw error;
  }
}

// CLI Interface
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log(`
Usage: npm run ingest -- <youtube-url> <category> [title]

Categories:
  - n8n: n8n workflow automation content
  - claude-code: Claude Code features and patterns
  - integrations: Integration patterns and best practices

Example:
  npm run ingest -- "https://youtube.com/watch?v=example" n8n "Advanced n8n Patterns"
  `);
  process.exit(1);
}

const [url, category, title] = args;

if (!['n8n', 'claude-code', 'integrations'].includes(category)) {
  console.error('Invalid category. Must be: n8n, claude-code, or integrations');
  process.exit(1);
}

ingestVideo(url, category as any, title).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

/**
 * Global Type Declarations
 *
 * Declares types for modules without TypeScript definitions.
 */

// IMAP module
declare module 'imap' {
  import { EventEmitter } from 'events'

  interface ImapConfig {
    user: string
    password: string
    host: string
    port: number
    tls: boolean
    tlsOptions?: { rejectUnauthorized: boolean }
    connTimeout?: number
    authTimeout?: number
  }

  interface ImapBox {
    name: string
    messages: { total: number; new: number }
  }

  interface ImapFetch extends EventEmitter {
    on(event: 'message', callback: (msg: ImapMessage, seqno: number) => void): this
    on(event: 'error', callback: (err: Error) => void): this
    on(event: 'end', callback: () => void): this
  }

  interface ImapMessage extends EventEmitter {
    on(event: 'body', callback: (stream: NodeJS.ReadableStream, info: any) => void): this
    on(event: 'attributes', callback: (attrs: any) => void): this
    on(event: 'end', callback: () => void): this
  }

  class Imap extends EventEmitter {
    constructor(config: ImapConfig)
    connect(): void
    end(): void
    openBox(mailbox: string, readonly: boolean, callback: (err: Error | null, box: ImapBox) => void): void
    search(criteria: any[], callback: (err: Error | null, results: number[]) => void): void
    fetch(source: number[] | string, options: any): ImapFetch
    getBoxes(callback: (err: Error | null, boxes: any) => void): void
    seq: {
      fetch(source: string, options: any): ImapFetch
    }
  }

  export = Imap
}

// Mailparser module
declare module 'mailparser' {
  import { Transform } from 'stream'

  interface ParsedMail {
    from?: { value: Array<{ address: string; name: string }> }
    to?: { value: Array<{ address: string; name: string }> }
    subject?: string
    text?: string
    html?: string
    date?: Date
    messageId?: string
    attachments?: Array<{
      filename: string
      contentType: string
      size: number
      content: Buffer
    }>
  }

  export function simpleParser(source: NodeJS.ReadableStream | string | Buffer): Promise<ParsedMail>

  export class MailParser extends Transform {
    on(event: 'data', callback: (mail: ParsedMail) => void): this
    on(event: 'end', callback: () => void): this
    on(event: 'error', callback: (err: Error) => void): this
  }
}

// pg module (basic declarations)
declare module 'pg' {
  export interface PoolConfig {
    connectionString?: string
    host?: string
    port?: number
    database?: string
    user?: string
    password?: string
    ssl?: boolean | { rejectUnauthorized: boolean }
    max?: number
    idleTimeoutMillis?: number
    connectionTimeoutMillis?: number
  }

  export interface QueryResult<T = any> {
    rows: T[]
    rowCount: number
    command: string
    fields: any[]
  }

  export class Pool {
    constructor(config?: PoolConfig)
    query<T = any>(text: string, values?: any[]): Promise<QueryResult<T>>
    connect(): Promise<PoolClient>
    end(): Promise<void>
  }

  export class Client {
    constructor(config?: PoolConfig)
    connect(): Promise<void>
    query<T = any>(text: string, values?: any[]): Promise<QueryResult<T>>
    end(): Promise<void>
  }

  export interface PoolClient extends Client {
    release(err?: Error): void
  }
}

// youtube-transcript module
declare module 'youtube-transcript' {
  export interface TranscriptItem {
    text: string
    duration: number
    offset: number
  }

  export class YoutubeTranscript {
    static fetchTranscript(videoId: string): Promise<TranscriptItem[]>
  }
}

// @anthropic-ai/sdk module
declare module '@anthropic-ai/sdk' {
  export interface Message {
    content: Array<{ type: string; text?: string }>
    model: string
    stop_reason: string
  }

  export interface MessageCreateParams {
    model: string
    max_tokens: number
    messages: Array<{ role: string; content: string }>
    system?: string
  }

  export default class Anthropic {
    constructor(config?: { apiKey?: string })
    messages: {
      create(params: MessageCreateParams): Promise<Message>
    }
  }
}

// @modelcontextprotocol/sdk modules
declare module '@modelcontextprotocol/sdk/server/index.js' {
  export class Server {
    constructor(info: { name: string; version: string }, options?: any)
    setRequestHandler(type: any, handler: (request: any) => Promise<any>): void
    connect(transport: any): Promise<void>
    close(): Promise<void>
  }
}

declare module '@modelcontextprotocol/sdk/server/stdio.js' {
  export class StdioServerTransport {
    constructor()
  }
}

declare module '@modelcontextprotocol/sdk/types.js' {
  export const ListToolsRequestSchema: any
  export const CallToolRequestSchema: any
  export const ListResourcesRequestSchema: any
  export const ReadResourceRequestSchema: any
  export const ListPromptsRequestSchema: any
  export const GetPromptRequestSchema: any
  export interface Tool {
    name: string
    description: string
    inputSchema: Record<string, any>
  }
}

// Internal Gmail integration module (placeholder)
declare module '*/shared/libs/integrations/gmail' {
  export interface GmailSendOptions {
    to: string
    subject: string
    body?: string
    html?: string
  }
  export interface GmailSendResult {
    id: string
    threadId: string
    messageId: string
    success: boolean
    error?: string
  }
  export interface GmailClient {
    send(options: GmailSendOptions): Promise<GmailSendResult>
    getInfo(): { email: string; connected: boolean; isConfigured: boolean; fromName: string; userEmail: string }
    healthCheck(): Promise<{ healthy: boolean; status: string; error?: string; email: string }>
  }
  export const gmailClient: GmailClient
}

// zod module (basic declarations)
declare module 'zod' {
  export const z: {
    string: () => any
    number: () => any
    boolean: () => any
    object: (shape: Record<string, any>) => any
    array: (type: any) => any
    enum: (values: string[]) => any
    optional: () => any
    infer: <T>(schema: T) => any
  }
}

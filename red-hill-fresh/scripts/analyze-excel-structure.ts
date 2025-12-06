/**
 * Downloads and analyzes Excel structure for a specific email attachment
 * Usage: npx tsx analyze-excel-structure.ts [message_id] [attachment_filename]
 */
import * as XLSX from 'xlsx';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env.test') });

// Simple Gmail client for downloading attachments
class GmailClient {
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private accessToken?: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.refreshToken = process.env.REDHILLFRESH_GMAIL_REFRESH_TOKEN || '';
  }

  private async refreshAccessToken(): Promise<void> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const data = await response.json() as { access_token: string };
    this.accessToken = data.access_token;
  }

  async getMessage(messageId: string): Promise<any> {
    if (!this.accessToken) await this.refreshAccessToken();
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );
    return response.json();
  }

  async getAttachment(messageId: string, attachmentId: string): Promise<string> {
    if (!this.accessToken) await this.refreshAccessToken();
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );
    const data = await response.json() as { data: string };
    return data.data.replace(/-/g, '+').replace(/_/g, '/');
  }

  async searchMessages(query: string): Promise<any[]> {
    if (!this.accessToken) await this.refreshAccessToken();
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=10`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );
    const data = await response.json() as { messages?: { id: string }[] };
    return data.messages || [];
  }
}

async function analyzeExcel(buffer: Buffer, filename: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Analyzing: ${filename}`);
  console.log('='.repeat(60));

  const workbook = XLSX.read(buffer, { type: 'buffer' });

  for (const sheetName of workbook.SheetNames) {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    console.log(`Total rows: ${jsonData.length}`);
    console.log('\nFirst 25 rows:');

    for (let i = 0; i < Math.min(25, jsonData.length); i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) {
        console.log(`  ${i}: [empty]`);
        continue;
      }
      // Show first 8 cells, truncated
      const cells = row.slice(0, 8).map((c: any) => {
        if (c === null || c === undefined) return '';
        const s = String(c).replace(/\n/g, '\\n').replace(/\r/g, '');
        return s.length > 18 ? s.substring(0, 15) + '...' : s;
      });
      console.log(`  ${i}: [${cells.join(' | ')}]`);
    }
  }
}

async function main() {
  const gmail = new GmailClient();

  // Search for recent emails from OGG and BDM with attachments
  console.log('Searching for OGG emails...');
  const oggMsgs = await gmail.searchMessages('from:organicgrowersgroup.com.au has:attachment newer_than:14d');
  console.log(`Found ${oggMsgs.length} OGG emails`);

  console.log('\nSearching for BDM emails...');
  const bdmMsgs = await gmail.searchMessages('from:biodynamic.com.au has:attachment newer_than:14d');
  console.log(`Found ${bdmMsgs.length} BDM emails`);

  // Get first OGG email with attachment
  if (oggMsgs.length > 0) {
    const msg = await gmail.getMessage(oggMsgs[0].id);
    const parts = msg.payload?.parts || [];
    for (const part of parts) {
      if (part.filename && part.filename.endsWith('.xlsx')) {
        console.log(`\nDownloading OGG: ${part.filename}`);
        const base64 = await gmail.getAttachment(msg.id, part.body.attachmentId);
        const buffer = Buffer.from(base64, 'base64');
        await analyzeExcel(buffer, part.filename);
        break;
      }
    }
  }

  // Check all BDM emails for attachments
  console.log('\nChecking BDM emails for xlsx attachments...');
  for (const msgRef of bdmMsgs.slice(0, 5)) {
    const msg = await gmail.getMessage(msgRef.id);
    const subject = msg.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || 'No subject';
    console.log(`  ${subject.substring(0, 50)}`);

    const parts = msg.payload?.parts || [];
    const attachments = parts.filter((p: any) => p.filename).map((p: any) => p.filename);
    if (attachments.length > 0) {
      console.log(`    Attachments: ${attachments.join(', ')}`);

      for (const part of parts) {
        if (part.filename && part.filename.endsWith('.xlsx')) {
          console.log(`\nDownloading BDM: ${part.filename}`);
          const base64 = await gmail.getAttachment(msg.id, part.body.attachmentId);
          const buffer = Buffer.from(base64, 'base64');
          await analyzeExcel(buffer, part.filename);
          return; // Stop after first xlsx
        }
      }
    } else {
      console.log(`    No attachments`);
    }
  }
}

main().catch(console.error);

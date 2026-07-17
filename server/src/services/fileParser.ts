import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import { extractText as pdfExtract } from './pdfParser';
import { performOCR } from './ocrService';

export async function parseFile(filePath: string, mimeType: string): Promise<string> {
  switch (mimeType) {
    case 'application/pdf':
      return pdfExtract(filePath);

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/msword': {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }

    case 'text/plain':
      return fs.readFileSync(filePath, 'utf-8');

    case 'application/vnd.ms-powerpoint':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
      const text = fs.readFileSync(filePath, 'utf-8');
      const textMatches = text.match(/<a:t>([^<]+)<\/a:t>/g);
      if (textMatches) {
        return textMatches.map((m: string) => m.replace(/<\/?a:t>/g, '')).join('\n');
      }
      return '[PPT parsing limited - text extraction from XML]';
    }

    case 'image/jpeg':
    case 'image/png':
    case 'image/webp':
    case 'image/tiff':
      return performOCR(filePath);

    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

export function extractTopics(text: string): string[] {
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need',
    'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
    'we', 'us', 'our', 'you', 'your', 'he', 'she', 'him', 'her', 'his',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !commonWords.has(w));

  const frequency = new Map<string, number>();
  for (const word of words) {
    frequency.set(word, (frequency.get(word) || 0) + 1);
  }

  const bigrams = new Map<string, number>();
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
  }

  const candidates = new Map<string, number>();
  for (const [word, count] of frequency) {
    if (count >= 2) candidates.set(word, count);
  }
  for (const [bigram, count] of bigrams) {
    if (count >= 2) candidates.set(bigram, count);
  }

  const sorted = [...candidates.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic]) => topic.charAt(0).toUpperCase() + topic.slice(1));

  return sorted.length > 0 ? sorted : ['General'];
}

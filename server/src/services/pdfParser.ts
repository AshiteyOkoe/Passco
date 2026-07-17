import fs from 'fs';

export async function extractText(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);

  try {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(dataBuffer);
    return data.text || '';
  } catch (error) {
    console.error('PDF parse error:', error);
    throw new Error('Failed to parse PDF file');
  }
}

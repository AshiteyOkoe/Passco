import fs from 'fs';
import { createWorker } from 'tesseract.js';

export async function performOCR(imagePath: string): Promise<string> {
  try {
    const worker = await createWorker('eng');
    const { data } = await worker.recognize(imagePath);
    await worker.terminate();
    return data.text || '';
  } catch (error) {
    console.error('OCR error:', error);

    try {
      const sharp = (await import('sharp')).default;
      const optimizedPath = imagePath.replace(/(\.\w+)$/, '_optimized$1');
      await sharp(imagePath).grayscale().normalise().toFile(optimizedPath);

      const worker = await createWorker('eng');
      const { data } = await worker.recognize(optimizedPath);
      await worker.terminate();

      try { fs.unlinkSync(optimizedPath); } catch { /* ignore */ }
      return data.text || '';
    } catch {
      throw new Error('OCR processing failed');
    }
  }
}

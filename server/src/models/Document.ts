import mongoose, { Schema, Document } from 'mongoose';

export interface IDocument extends Document {
  userId: mongoose.Types.ObjectId;
  originalName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  extractedText: string;
  topics: string[];
  status: 'processing' | 'ready' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    originalName: { type: String, required: true },
    storagePath: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    extractedText: { type: String, default: '' },
    topics: [{ type: String }],
    status: { type: String, enum: ['processing', 'ready', 'failed'], default: 'processing' },
  },
  { timestamps: true }
);

documentSchema.index({ userId: 1 });
documentSchema.index({ status: 1 });

export default mongoose.model<IDocument>('Document', documentSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IBulkUpload extends Document {
  userId: mongoose.Types.ObjectId;
  fileName: string;
  mimeType: string;
  fileSize: number;
  status: 'processing' | 'parsed' | 'saving' | 'completed' | 'failed';
  totalQuestions: number;
  savedQuestions: number;
  subjectBreakdown: Record<string, number>;
  classBreakdown: Record<string, number>;
  difficultyBreakdown: Record<string, number>;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bulkUploadSchema = new Schema<IBulkUpload>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    status: { type: String, enum: ['processing', 'parsed', 'saving', 'completed', 'failed'], default: 'processing' },
    totalQuestions: { type: Number, default: 0 },
    savedQuestions: { type: Number, default: 0 },
    subjectBreakdown: { type: Schema.Types.Mixed, default: {} },
    classBreakdown: { type: Schema.Types.Mixed, default: {} },
    difficultyBreakdown: { type: Schema.Types.Mixed, default: {} },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

bulkUploadSchema.index({ userId: 1 });
bulkUploadSchema.index({ status: 1 });

export default mongoose.model<IBulkUpload>('BulkUpload', bulkUploadSchema);

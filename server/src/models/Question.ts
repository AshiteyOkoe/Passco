import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  documentId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  question: string;
  type: 'multiple-choice' | 'true-false';
  options?: string[];
  correctAnswer: string | boolean;
  explanation: string;
  difficulty: 'beginner' | 'intermediate' | 'expert';
  topic: string;
  subject: string;
  classLevel: string;
  approved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: String, required: true },
    type: { type: String, enum: ['multiple-choice', 'true-false'], required: true },
    options: [{ type: String }],
    correctAnswer: { type: Schema.Types.Mixed, required: true },
    explanation: { type: String, default: '' },
    difficulty: { type: String, enum: ['beginner', 'intermediate', 'expert'], default: 'intermediate' },
    topic: { type: String, default: '' },
    subject: { type: String, default: '' },
    classLevel: { type: String, default: '' },
    approved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

questionSchema.index({ documentId: 1 });
questionSchema.index({ createdBy: 1 });
questionSchema.index({ approved: 1 });
questionSchema.index({ topic: 1 });
questionSchema.index({ subject: 1 });
questionSchema.index({ classLevel: 1 });

export default mongoose.model<IQuestion>('Question', questionSchema);

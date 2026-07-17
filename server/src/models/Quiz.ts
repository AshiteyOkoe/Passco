import mongoose, { Schema, Document } from 'mongoose';

export interface IQuiz extends Document {
  title: string;
  description?: string;
  documentId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId[];
  questions: mongoose.Types.ObjectId[];
  difficulty: 'beginner' | 'intermediate' | 'expert';
  timeLimit: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const quizSchema = new Schema<IQuiz>(
  {
    title: { type: String, required: true },
    description: { type: String },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    difficulty: { type: String, enum: ['beginner', 'intermediate', 'expert'], default: 'intermediate' },
    timeLimit: { type: Number, default: 600 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

quizSchema.index({ createdBy: 1 });
quizSchema.index({ assignedTo: 1 });
quizSchema.index({ isActive: 1 });

export default mongoose.model<IQuiz>('Quiz', quizSchema);

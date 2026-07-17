import mongoose, { Schema, Document } from 'mongoose';

export interface IAssessmentResult extends Document {
  userId: mongoose.Types.ObjectId;
  classLevel: string;
  subject: string;
  difficulty: string;
  assessmentType: string;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  percentage: number;
  grade: string;
  passed: boolean;
  timeSpent: number;
  timeLimit: number;
  abandoned: boolean;
  answers: Array<{
    questionId: string;
    userAnswer: string | null;
    correctAnswer: string | boolean;
    isCorrect: boolean;
    subject: string;
  }>;
  createdAt: Date;
}

const assessmentResultSchema = new Schema<IAssessmentResult>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    classLevel: { type: String, required: true },
    subject: { type: String, default: '' },
    difficulty: { type: String, required: true },
    assessmentType: { type: String, required: true },
    totalQuestions: { type: Number, required: true },
    answeredQuestions: { type: Number, required: true },
    correctAnswers: { type: Number, required: true },
    percentage: { type: Number, required: true },
    grade: { type: String, required: true },
    passed: { type: Boolean, required: true },
    timeSpent: { type: Number, required: true },
    timeLimit: { type: Number, required: true },
    abandoned: { type: Boolean, default: false },
    answers: [{
      questionId: String,
      userAnswer: Schema.Types.Mixed,
      correctAnswer: Schema.Types.Mixed,
      isCorrect: Boolean,
      subject: String,
    }],
  },
  { timestamps: true }
);

assessmentResultSchema.index({ classLevel: 1 });
assessmentResultSchema.index({ subject: 1 });
assessmentResultSchema.index({ percentage: -1 });

export default mongoose.model<IAssessmentResult>('AssessmentResult', assessmentResultSchema);

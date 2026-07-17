import mongoose, { Schema, Document } from 'mongoose';

interface IAnswerDetail {
  questionId: mongoose.Types.ObjectId;
  userAnswer: string | boolean | null;
  correctAnswer: string | boolean;
  isCorrect: boolean;
  timeSpent: number;
}

export interface IResult extends Document {
  userId: mongoose.Types.ObjectId;
  quizId: mongoose.Types.ObjectId;
  answers: IAnswerDetail[];
  score: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  timeTaken: number;
  completedAt: Date;
}

const answerDetailSchema = new Schema<IAnswerDetail>({
  questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
  userAnswer: { type: Schema.Types.Mixed },
  correctAnswer: { type: Schema.Types.Mixed, required: true },
  isCorrect: { type: Boolean, required: true },
  timeSpent: { type: Number, default: 0 },
});

const resultSchema = new Schema<IResult>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    answers: [answerDetailSchema],
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    correctCount: { type: Number, required: true },
    incorrectCount: { type: Number, required: true },
    skippedCount: { type: Number, required: true },
    timeTaken: { type: Number, required: true },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

resultSchema.index({ userId: 1 });
resultSchema.index({ quizId: 1 });
resultSchema.index({ userId: 1, completedAt: -1 });

export default mongoose.model<IResult>('Result', resultSchema);

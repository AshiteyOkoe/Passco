import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'student' | 'admin';
  institution?: string;
  gradeLevel?: string;
  avatar?: string;
  gender?: 'male' | 'female';
  dateOfBirth?: Date;
  classLevel?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    institution: { type: String, trim: true },
    gradeLevel: { type: String, trim: true },
    avatar: { type: String, default: '' },
    gender: { type: String, enum: ['male', 'female'], default: undefined },
    dateOfBirth: { type: Date, required: true },
    classLevel: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

export default mongoose.model<IUser>('User', userSchema);

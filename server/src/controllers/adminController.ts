import { Response } from 'express';
import User from '../models/User';
import Document from '../models/Document';
import Question from '../models/Question';
import Quiz from '../models/Quiz';
import Result from '../models/Result';
import { AuthRequest } from '../types';

export async function getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalDocuments = await Document.countDocuments();
    const totalQuestions = await Question.countDocuments();
    const pendingQuestions = await Question.countDocuments({ approved: false });
    const totalQuizzes = await Quiz.countDocuments();
    const totalResults = await Result.countDocuments();

    const recentDocuments = await Document.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentResults = await Result.find()
      .populate('userId', 'name email')
      .populate('quizId', 'title')
      .sort({ completedAt: -1 })
      .limit(5);

    res.json({
      stats: {
        totalStudents,
        totalDocuments,
        totalQuestions,
        pendingQuestions,
        totalQuizzes,
        totalResults,
      },
      recentDocuments: recentDocuments.map((doc) => ({
        id: doc._id,
        name: doc.originalName,
        uploadedBy: (doc.userId as unknown as { name: string }).name,
        status: doc.status,
        createdAt: doc.createdAt,
      })),
      recentResults: recentResults.map((res) => ({
        id: res._id,
        studentName: (res.userId as unknown as { name: string }).name,
        quizTitle: (res.quizId as unknown as { title: string }).title,
        score: res.score,
        completedAt: res.completedAt,
      })),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
}

export async function getStudents(req: AuthRequest, res: Response): Promise<void> {
  try {
    const students = await User.find({ role: 'student' })
      .select('-password')
      .sort({ createdAt: -1 });

    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const resultCount = await Result.countDocuments({ userId: student._id });
        const avgResult = await Result.aggregate([
          { $match: { userId: student._id } },
          { $group: { _id: null, avgScore: { $avg: '$score' } } },
        ]);
        const documentCount = await Document.countDocuments({ userId: student._id });

        return {
          id: student._id,
          name: student.name,
          email: student.email,
          institution: student.institution,
          gradeLevel: student.gradeLevel,
          avatar: student.avatar || '',
          gender: student.gender || '',
          quizzesTaken: resultCount,
          avgScore: avgResult.length > 0 ? Math.round(avgResult[0].avgScore) : 0,
          documentsUploaded: documentCount,
          createdAt: student.createdAt,
        };
      })
    );

    res.json({ students: studentsWithStats });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Failed to fetch students' });
  }
}

export async function getFullAnalytics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const totalQuizzes = await Result.countDocuments();
    const avgScore = await Result.aggregate([
      { $group: { _id: null, avg: { $avg: '$score' } } },
    ]);

    const scoreDistribution = await Result.aggregate([
      {
        $bucket: {
          groupBy: '$score',
          boundaries: [0, 25, 50, 60, 75, 90, 100],
          default: 'Other',
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    const resultsByDay = await Result.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          count: { $sum: 1 },
          avgScore: { $avg: '$score' },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 30 },
    ]);

    res.json({
      totalQuizzes,
      averageScore: avgScore.length > 0 ? Math.round(avgScore[0].avg) : 0,
      scoreDistribution,
      resultsByDay: resultsByDay.map((r) => ({
        date: r._id,
        count: r.count,
        avgScore: Math.round(r.avgScore),
      })),
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
}

export async function getStudentDetail(req: AuthRequest, res: Response): Promise<void> {
  try {
    const student = await User.findById(req.params.id).select('-password');
    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    const documents = await Document.find({ userId: student._id }).sort({ createdAt: -1 });
    const results = await Result.find({ userId: student._id })
      .populate('quizId', 'title questions')
      .sort({ completedAt: -1 });
    const questions = await Question.find({ createdBy: student._id }).sort({ createdAt: -1 });

    res.json({
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        institution: student.institution,
        gradeLevel: student.gradeLevel,
        createdAt: student.createdAt,
      },
      documents: documents.map((doc) => ({
        id: doc._id,
        name: doc.originalName,
        status: doc.status,
        fileSize: doc.fileSize,
        createdAt: doc.createdAt,
      })),
      results: results.map((r) => ({
        id: r._id,
        quizTitle: (r.quizId as unknown as { title: string }).title,
        score: r.score,
        totalQuestions: r.totalQuestions,
        correctCount: r.correctCount,
        incorrectCount: r.incorrectCount,
        skippedCount: r.skippedCount,
        timeTaken: r.timeTaken,
        completedAt: r.completedAt,
      })),
      questionsCreated: questions.length,
      stats: {
        documentsUploaded: documents.length,
        quizzesTaken: results.length,
        questionsCreated: questions.length,
        avgScore:
          results.length > 0
            ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
            : 0,
      },
    });
  } catch (error) {
    console.error('Get student detail error:', error);
    res.status(500).json({ message: 'Failed to fetch student details' });
  }
}

export async function deleteStudent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const student = await User.findById(req.params.id);
    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    await Promise.all([
      Document.deleteMany({ userId: student._id }),
      Question.deleteMany({ createdBy: student._id }),
      Result.deleteMany({ userId: student._id }),
      Quiz.deleteMany({ createdBy: student._id }),
    ]);

    await User.findByIdAndDelete(student._id);

    res.json({ message: 'Student and all associated data deleted' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ message: 'Failed to delete student' });
  }
}

export async function getStudentResults(req: AuthRequest, res: Response): Promise<void> {
  try {
    const student = await User.findById(req.params.id).select('-password');
    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    const results = await Result.find({ userId: student._id })
      .populate('quizId', 'title questions difficulty timeLimit')
      .sort({ completedAt: -1 });

    res.json({
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
      },
      results: results.map((r) => ({
        id: r._id,
        quiz: {
          id: (r.quizId as unknown as { _id: string })._id,
          title: (r.quizId as unknown as { title: string }).title,
          difficulty: (r.quizId as unknown as { difficulty: string }).difficulty,
          totalQuestions: (r.quizId as unknown as { questions: string[] }).questions.length,
        },
        score: r.score,
        totalQuestions: r.totalQuestions,
        correctCount: r.correctCount,
        incorrectCount: r.incorrectCount,
        skippedCount: r.skippedCount,
        timeTaken: r.timeTaken,
        completedAt: r.completedAt,
      })),
    });
  } catch (error) {
    console.error('Get student results error:', error);
    res.status(500).json({ message: 'Failed to fetch student results' });
  }
}

export async function getAllQuizzes(req: AuthRequest, res: Response): Promise<void> {
  try {
    const quizzes = await Quiz.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    const quizzesWithStats = await Promise.all(
      quizzes.map(async (quiz) => {
        const resultCount = await Result.countDocuments({ quizId: quiz._id });
        return {
          id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          difficulty: quiz.difficulty,
          timeLimit: quiz.timeLimit,
          isActive: quiz.isActive,
          createdBy: {
            id: (quiz.createdBy as unknown as { _id: string })._id,
            name: (quiz.createdBy as unknown as { name: string }).name,
            email: (quiz.createdBy as unknown as { email: string }).email,
          },
          questionsCount: quiz.questions.length,
          resultCount,
          createdAt: quiz.createdAt,
        };
      })
    );

    res.json({ quizzes: quizzesWithStats });
  } catch (error) {
    console.error('Get all quizzes error:', error);
    res.status(500).json({ message: 'Failed to fetch quizzes' });
  }
}

export async function getAllDocuments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const documents = await Document.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    const documentsWithStats = await Promise.all(
      documents.map(async (doc) => {
        const questionCount = await Question.countDocuments({ documentId: doc._id });
        return {
          id: doc._id,
          name: doc.originalName,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          status: doc.status,
          topics: doc.topics,
          uploadedBy: {
            id: (doc.userId as unknown as { _id: string })._id,
            name: (doc.userId as unknown as { name: string }).name,
            email: (doc.userId as unknown as { email: string }).email,
          },
          questionCount,
          createdAt: doc.createdAt,
        };
      })
    );

    res.json({ documents: documentsWithStats });
  } catch (error) {
    console.error('Get all documents error:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
}

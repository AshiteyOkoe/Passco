import { Response } from 'express';
import Quiz from '../models/Quiz';
import Question from '../models/Question';
import Result from '../models/Result';
import { AuthRequest } from '../types';

export async function createQuiz(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { title, description, documentId, questions, difficulty, timeLimit, assignedTo } = req.body;

    const quiz = await Quiz.create({
      title,
      description,
      documentId,
      createdBy: req.user!.id,
      questions,
      difficulty: difficulty || 'intermediate',
      timeLimit: timeLimit || 600,
      assignedTo: assignedTo || [],
    });

    res.status(201).json({ message: 'Quiz created successfully', quiz });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ message: 'Failed to create quiz' });
  }
}

export async function getQuizzes(req: AuthRequest, res: Response): Promise<void> {
  try {
    let quizzes;

    if (req.user?.role === 'admin') {
      quizzes = await Quiz.find()
        .populate('createdBy', 'name email')
        .populate('questions')
        .sort({ createdAt: -1 });
    } else {
      quizzes = await Quiz.find({
        $or: [
          { assignedTo: { $in: [req.user!.id] } },
          { createdBy: req.user!.id },
        ],
        isActive: true,
      })
        .populate('createdBy', 'name email')
        .populate('questions')
        .sort({ createdAt: -1 });
    }

    res.json({ quizzes });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ message: 'Failed to fetch quizzes' });
  }
}

export async function getQuizById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const selectFields = req.user?.role === 'student' ? { correctAnswer: 0 } : {};
    const quiz = await Quiz.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate({
        path: 'questions',
        select: selectFields,
      });

    if (!quiz) {
      res.status(404).json({ message: 'Quiz not found' });
      return;
    }

    if (req.user?.role === 'student') {
      const isAssigned = quiz.assignedTo.some((id) => id.toString() === req.user!.id);
      const isCreator = quiz.createdBy.toString() === req.user.id;
      if (!isAssigned && !isCreator) {
        res.status(403).json({ message: 'Not authorized' });
        return;
      }
    }

    res.json({ quiz });
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ message: 'Failed to fetch quiz' });
  }
}

export async function submitQuiz(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { answers, timeTaken } = req.body;

    const quiz = await Quiz.findById(id).populate('questions');
    if (!quiz) {
      res.status(404).json({ message: 'Quiz not found' });
      return;
    }

    const questions = quiz.questions as unknown as Array<{
      _id: string;
      correctAnswer: string | boolean;
      type: string;
    }>;

    let correctCount = 0;
    let incorrectCount = 0;
    let skippedCount = 0;
    const answerDetails = [];

    for (const question of questions) {
      const userAnswer = answers.find((a: { questionId: string }) => a.questionId === question._id)?.answer ?? null;

      let isCorrect = false;
      if (userAnswer === null || userAnswer === undefined || userAnswer === '') {
        skippedCount++;
      } else {
        if (question.type === 'true-false') {
          isCorrect = userAnswer === question.correctAnswer;
        } else {
          isCorrect = String(userAnswer).toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim();
        }
        if (isCorrect) correctCount++;
        else incorrectCount++;
      }

      answerDetails.push({
        questionId: question._id,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        timeSpent: 0,
      });
    }

    const result = await Result.create({
      userId: req.user!.id,
      quizId: id,
      answers: answerDetails,
      score: Math.round((correctCount / questions.length) * 100),
      totalQuestions: questions.length,
      correctCount,
      incorrectCount,
      skippedCount,
      timeTaken,
      completedAt: new Date(),
    });

    res.status(201).json({
      message: 'Quiz submitted successfully',
      result: {
        id: result._id,
        score: result.score,
        correctCount: result.correctCount,
        incorrectCount: result.incorrectCount,
        skippedCount: result.skippedCount,
        totalQuestions: result.totalQuestions,
        timeTaken: result.timeTaken,
      },
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ message: 'Failed to submit quiz' });
  }
}

export async function getResults(req: AuthRequest, res: Response): Promise<void> {
  try {
    const filter: Record<string, unknown> = {};

    if (req.user?.role === 'student') {
      filter.userId = req.user.id;
    }
    if (req.query.quizId) {
      filter.quizId = req.query.quizId;
    }

    const results = await Result.find(filter)
      .populate('quizId', 'title difficulty')
      .sort({ completedAt: -1 });

    res.json({ results });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ message: 'Failed to fetch results' });
  }
}

export async function getResultById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await Result.findById(req.params.id)
      .populate({
        path: 'quizId',
        select: 'title difficulty questions',
        populate: { path: 'questions' },
      });

    if (!result) {
      res.status(404).json({ message: 'Result not found' });
      return;
    }

    if (result.userId.toString() !== req.user?.id && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    res.json({ result });
  } catch (error) {
    console.error('Get result error:', error);
    res.status(500).json({ message: 'Failed to fetch result' });
  }
}

export async function assignQuiz(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userIds } = req.body;

    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { assignedTo: { $each: userIds } } },
      { new: true }
    );

    if (!quiz) {
      res.status(404).json({ message: 'Quiz not found' });
      return;
    }

    res.json({ message: 'Quiz assigned successfully', quiz });
  } catch (error) {
    console.error('Assign quiz error:', error);
    res.status(500).json({ message: 'Failed to assign quiz' });
  }
}

export async function getQuizByDocumentId(req: AuthRequest, res: Response): Promise<void> {
  try {
    const quiz = await Quiz.findOne({ documentId: req.params.documentId })
      .populate('createdBy', 'name email')
      .populate({
        path: 'questions',
        select: req.user?.role === 'student' ? { correctAnswer: 0 } : {},
      });

    if (!quiz) {
      res.status(404).json({ message: 'No quiz found for this document' });
      return;
    }

    res.json({ quiz });
  } catch (error) {
    console.error('Get quiz by document error:', error);
    res.status(500).json({ message: 'Failed to fetch quiz' });
  }
}

export async function getStudentAnalytics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const results = await Result.find({ userId: req.user!.id }).sort({ completedAt: -1 });

    if (results.length === 0) {
      res.json({
        totalQuizzes: 0,
        averageScore: 0,
        totalCorrect: 0,
        totalQuestions: 0,
        recentResults: [],
        scoreHistory: [],
        weakTopics: [],
      });
      return;
    }

    const totalQuizzes = results.length;
    const averageScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / totalQuizzes);
    const totalCorrect = results.reduce((sum, r) => sum + r.correctCount, 0);
    const totalQuestions = results.reduce((sum, r) => sum + r.totalQuestions, 0);

    let weakAreas: Record<string, { correct: number; total: number }> = {};
    for (const result of results) {
      for (const answer of result.answers) {
        const topic = 'Question'; 
        if (!weakAreas[topic]) weakAreas[topic] = { correct: 0, total: 0 };
        weakAreas[topic].total++;
        if (answer.isCorrect) weakAreas[topic].correct++;
      }
    }

    const weakTopics = Object.entries(weakAreas)
      .filter(([_, data]) => data.total >= 2)
      .map(([topic, data]) => ({
        topic,
        score: Math.round((data.correct / data.total) * 100),
        total: data.total,
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);

    res.json({
      totalQuizzes,
      averageScore,
      totalCorrect,
      totalQuestions,
      recentResults: results.slice(0, 10).map((r) => ({
        id: r._id,
        score: r.score,
        totalQuestions: r.totalQuestions,
        correctCount: r.correctCount,
        completedAt: r.completedAt,
      })),
      scoreHistory: results.reverse().map((r) => ({
        date: r.completedAt,
        score: r.score,
      })),
      weakTopics,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
}

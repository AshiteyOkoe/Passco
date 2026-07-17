import { Response } from 'express';
import AssessmentResult from '../models/AssessmentResult';
import { AuthRequest } from '../types';

export async function saveAssessmentResult(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const result = await AssessmentResult.create({
      userId,
      ...req.body,
    });

    res.status(201).json({ id: result._id, message: 'Assessment result saved' });
  } catch (error) {
    console.error('Save assessment result error:', error);
    res.status(500).json({ message: 'Failed to save assessment result' });
  }
}

export async function getMyAssessmentResults(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const results = await AssessmentResult.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ results });
  } catch (error) {
    console.error('Get assessment results error:', error);
    res.status(500).json({ message: 'Failed to fetch assessment results' });
  }
}

export async function getAllAssessmentResults(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { classLevel, subject, difficulty, page = '1', limit = '20' } = req.query;
    const filter: Record<string, string> = {};
    if (classLevel) filter.classLevel = classLevel as string;
    if (subject) filter.subject = subject as string;
    if (difficulty) filter.difficulty = difficulty as string;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [results, total] = await Promise.all([
      AssessmentResult.find(filter)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      AssessmentResult.countDocuments(filter),
    ]);

    res.json({
      results: results.map((r) => ({
        id: r._id,
        studentName: (r.userId as unknown as { name: string })?.name || 'Unknown',
        studentEmail: (r.userId as unknown as { email: string })?.email || '',
        classLevel: r.classLevel,
        subject: r.subject,
        difficulty: r.difficulty,
        assessmentType: r.assessmentType,
        totalQuestions: r.totalQuestions,
        correctAnswers: r.correctAnswers,
        percentage: r.percentage,
        grade: r.grade,
        passed: r.passed,
        timeSpent: r.timeSpent,
        createdAt: r.createdAt,
      })),
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Get all assessment results error:', error);
    res.status(500).json({ message: 'Failed to fetch assessment results' });
  }
}

export async function getAssessmentStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const totalAssessments = await AssessmentResult.countDocuments();
    const passedCount = await AssessmentResult.countDocuments({ passed: true });
    const avgResult = await AssessmentResult.aggregate([
      { $group: { _id: null, avgPercentage: { $avg: '$percentage' } } },
    ]);
    const avgPercentage = avgResult.length > 0 ? Math.round(avgResult[0].avgPercentage) : 0;

    const byClass = await AssessmentResult.aggregate([
      { $group: { _id: '$classLevel', count: { $sum: 1 }, avgScore: { $avg: '$percentage' } } },
      { $sort: { _id: 1 } },
    ]);

    const bySubject = await AssessmentResult.aggregate([
      { $match: { subject: { $ne: '' } } },
      { $group: { _id: '$subject', count: { $sum: 1 }, avgScore: { $avg: '$percentage' } } },
      { $sort: { count: -1 } },
    ]);

    const byDifficulty = await AssessmentResult.aggregate([
      { $group: { _id: '$difficulty', count: { $sum: 1 }, avgScore: { $avg: '$percentage' } } },
    ]);

    const recentResults = await AssessmentResult.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      totalAssessments,
      passedCount,
      failedCount: totalAssessments - passedCount,
      passRate: totalAssessments > 0 ? Math.round((passedCount / totalAssessments) * 100) : 0,
      avgPercentage,
      byClass,
      bySubject,
      byDifficulty,
      recentResults: recentResults.map((r) => ({
        id: r._id,
        studentName: (r.userId as unknown as { name: string })?.name || 'Unknown',
        classLevel: r.classLevel,
        subject: r.subject,
        difficulty: r.difficulty,
        assessmentType: r.assessmentType,
        percentage: r.percentage,
        grade: r.grade,
        passed: r.passed,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('Assessment stats error:', error);
    res.status(500).json({ message: 'Failed to fetch assessment stats' });
  }
}

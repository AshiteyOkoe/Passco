import { Response } from 'express';
import Question from '../models/Question';
import Document from '../models/Document';
import Quiz from '../models/Quiz';
import { AuthRequest } from '../types';

export async function createQuestion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { documentId, question, type, options, correctAnswer, explanation, difficulty, topic } = req.body;

    if (!documentId) {
      res.status(400).json({ message: 'Document ID is required' });
      return;
    }

    const document = await Document.findById(documentId);
    if (!document) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    const newQuestion = await Question.create({
      documentId,
      createdBy: req.user!.id,
      question,
      type,
      options: type === 'multiple-choice' ? options : undefined,
      correctAnswer,
      explanation,
      difficulty: difficulty || 'intermediate',
      topic: topic || document.topics[0] || 'General',
      approved: req.user?.role === 'admin',
    });

    res.status(201).json({
      message: 'Question created successfully',
      question: newQuestion,
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ message: 'Failed to create question' });
  }
}

export async function generateQuestionsFromDocument(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { documentId, difficulty, count } = req.body;
    const { generateQuestions } = await import('../services/aiService');

    const document = await Document.findById(documentId);
    if (!document) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    if (document.status !== 'ready') {
      res.status(400).json({ message: 'Document is not processed yet' });
      return;
    }

    const questionData = generateQuestions(
      document.extractedText,
      document.topics,
      difficulty || 'intermediate',
      count || 10
    );

    const createdQuestions = [];
    for (const qd of questionData) {
      const question = await Question.create({
        documentId: document._id,
        createdBy: req.user!.id,
        question: qd.question,
        type: qd.type,
        options: qd.type === 'multiple-choice' ? qd.options : undefined,
        correctAnswer: qd.correctAnswer,
        explanation: qd.explanation,
        difficulty: qd.difficulty,
        topic: qd.topic,
        approved: req.user?.role === 'admin',
      });
      createdQuestions.push(question);
    }

    const quiz = await Quiz.create({
      title: `${document.originalName} - ${difficulty || 'intermediate'} Quiz`,
      description: `Auto-generated quiz from ${document.originalName}`,
      documentId: document._id,
      createdBy: req.user!.id,
      assignedTo: [req.user!.id],
      questions: createdQuestions.map(q => q._id),
      difficulty: difficulty || 'intermediate',
      timeLimit: Math.max(createdQuestions.length * 30, 300),
    });

    res.status(201).json({
      message: 'Questions generated successfully',
      count: createdQuestions.length,
      questions: createdQuestions,
      quizId: quiz._id,
    });
  } catch (error) {
    console.error('Generate questions error:', error);
    res.status(500).json({ message: 'Failed to generate questions' });
  }
}

export async function getQuestions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.documentId) filter.documentId = req.query.documentId;
    if (req.query.topic) filter.topic = req.query.topic;
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;

    if (req.user?.role === 'student') {
      filter.approved = true;
    }

    const questions = await Question.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ questions });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ message: 'Failed to fetch questions' });
  }
}

export async function updateQuestion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (req.user?.role === 'admin') {
      const question = await Question.findByIdAndUpdate(id, updates, { new: true });
      if (!question) {
        res.status(404).json({ message: 'Question not found' });
        return;
      }
      res.json({ message: 'Question updated', question });
    } else {
      const question = await Question.findById(id);
      if (!question) {
        res.status(404).json({ message: 'Question not found' });
        return;
      }
      if (question.createdBy.toString() !== req.user!.id) {
        res.status(403).json({ message: 'Not authorized' });
        return;
      }
      const updated = await Question.findByIdAndUpdate(id, updates, { new: true });
      res.json({ message: 'Question updated', question: updated });
    }
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ message: 'Failed to update question' });
  }
}

export async function deleteQuestion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }

    if (question.createdBy.toString() !== req.user?.id && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    await Question.findByIdAndDelete(req.params.id);
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ message: 'Failed to delete question' });
  }
}

export async function getApprovedQuestions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const filter: Record<string, unknown> = { approved: true };
    if (req.query.subject) filter.subject = { $regex: `^${req.query.subject}$`, $options: 'i' };
    if (req.query.classLevel) filter.classLevel = req.query.classLevel;
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;
    if (req.query.type) filter.type = req.query.type;

    const questions = await Question.find(filter).sort({ createdAt: -1 });

    res.json({
      questions: questions.map(q => ({
        id: q._id,
        question: q.question,
        type: q.type,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        subject: q.subject,
        classLevel: q.classLevel,
        topic: q.topic,
      })),
    });
  } catch (error) {
    console.error('Get approved questions error:', error);
    res.status(500).json({ message: 'Failed to fetch approved questions' });
  }
}

export async function approveQuestion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true }
    );

    if (!question) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }

    res.json({ message: 'Question approved', question });
  } catch (error) {
    console.error('Approve question error:', error);
    res.status(500).json({ message: 'Failed to approve question' });
  }
}

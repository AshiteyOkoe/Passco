import { SUBJECT_META, type SubjectId } from '../data/questionBank';
import {
  buildReportData,
  DEFAULT_REPORT_OPTIONS,
  defaultGradeConfig,
  defaultThresholds,
  gradeFor,
  type ReportAssessment,
  type ReportData,
  type ReportTerm,
} from './reportCard';

const SAMPLE_YEAR = 2025;
const SAMPLE_TERM: ReportTerm = 'Full Year';

const PROFILES: Array<{ subjectKey: SubjectId; type: string; base: number }> = [
  { subjectKey: 'english', type: 'Assessment', base: 82 },
  { subjectKey: 'mathematics', type: 'Assessment', base: 74 },
  { subjectKey: 'science', type: 'Assessment', base: 68 },
  { subjectKey: 'social-studies', type: 'Assessment', base: 55 },
  { subjectKey: 'ict', type: 'Assessment', base: 90 },
  { subjectKey: 'rme', type: 'Assessment', base: 76 },
  { subjectKey: 'creative-arts', type: 'Assessment', base: 63 },
  { subjectKey: 'career-tech', type: 'Assessment', base: 58 },
];

const ASSESSMENT_TYPES = ['Quiz', 'Practice', 'Mock Examination'];
const DAY = 24 * 60 * 60 * 1000;
const start = new Date(2025, 10, 10).getTime();

function clampScore(base: number, delta: number): number {
  return Math.max(20, Math.min(100, base + delta));
}

export function buildSampleReport(): ReportData {
  const gradeConfig = defaultGradeConfig();
  const assessments: ReportAssessment[] = [];

  PROFILES.forEach((p, pi) => {
    [0, 1].forEach((attempt) => {
      const score = clampScore(p.base, attempt === 0 ? -2 : 3 + (pi % 4));
      const questions = 20;
      const correct = Math.round((score / 100) * questions);
      const timestamp = start + (pi * 12 + attempt * 4) * DAY;
      assessments.push({
        subject: SUBJECT_META[p.subjectKey].label,
        subjectKey: p.subjectKey,
        classLevel: 'jhs3',
        assessmentType: ASSESSMENT_TYPES[(pi + attempt) % ASSESSMENT_TYPES.length],
        questionsAttempted: questions,
        answeredQuestions: questions,
        correctAnswers: correct,
        percentage: score,
        grade: gradeFor(score, gradeConfig).grade,
        passed: score >= 50,
        timeSpent: 780 + score * 10,
        timestamp,
      });
    });

    const mockScore = clampScore(p.base, 6);
    const examScore = clampScore(p.base, 4);
    const beceScore = clampScore(p.base, 8 + (pi % 5));
    const baseTs = start + (pi * 12 + 10) * DAY;
    assessments.push(
      {
        subject: SUBJECT_META[p.subjectKey].label,
        subjectKey: p.subjectKey,
        classLevel: 'jhs3',
        assessmentType: 'Mock',
        questionsAttempted: 40,
        answeredQuestions: 40,
        correctAnswers: Math.round((mockScore / 100) * 40),
        percentage: mockScore,
        grade: gradeFor(mockScore, gradeConfig).grade,
        passed: true,
        timeSpent: 2100 + mockScore * 15,
        timestamp: baseTs,
      },
      {
        subject: SUBJECT_META[p.subjectKey].label,
        subjectKey: p.subjectKey,
        classLevel: 'jhs3',
        assessmentType: 'Examination',
        questionsAttempted: 40,
        answeredQuestions: 40,
        correctAnswers: Math.round((examScore / 100) * 40),
        percentage: examScore,
        grade: gradeFor(examScore, gradeConfig).grade,
        passed: true,
        timeSpent: 2000 + examScore * 15,
        timestamp: baseTs + 2 * DAY,
      },
      {
        subject: SUBJECT_META[p.subjectKey].label,
        subjectKey: p.subjectKey,
        classLevel: 'jhs3',
        assessmentType: 'Likely BECE',
        questionsAttempted: 50,
        answeredQuestions: 50,
        correctAnswers: Math.round((beceScore / 100) * 50),
        percentage: beceScore,
        grade: gradeFor(beceScore, gradeConfig).grade,
        passed: beceScore >= 50,
        timeSpent: 2400 + beceScore * 12,
        timestamp: baseTs + 4 * DAY,
      }
    );
  });

  return buildReportData({
    user: {
      id: 'demo-student-001',
      name: 'Ama Serwaa',
      institution: 'Adom Community School',
      classLevel: 'jhs3',
    },
    assessments,
    year: SAMPLE_YEAR,
    term: SAMPLE_TERM,
    gradeConfig,
    thresholds: defaultThresholds(),
    reportNumber: 'PASSCO-RPT-2025-000001',
    verificationCode: 'PASSCO-VRF-SAMPLE1',
    dateIssued: Date.now(),
    options: { ...DEFAULT_REPORT_OPTIONS },
  });
}
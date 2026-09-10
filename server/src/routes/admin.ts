import { Router } from 'express';
import {
  getDashboardStats,
  getStudents,
  getFullAnalytics,
  getStudentDetail,
  deleteStudent,
  getStudentResults,
  getAllQuizzes,
  getAllDocuments,
  getSubjectQuestionCounts,
  getCommandCenter,
  clearQuestionBank,
} from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  createReportCardForUser,
  listStudentReports,
  getReportCard,
  deleteReportCard,
  updateReportSettings,
} from '../controllers/reportCardController';
import {
  listDocumentRequests,
  approveDocumentRequest,
  rejectDocumentRequest,
} from '../controllers/documentRequestController';
import {
  listCompetitionsAdmin,
  adminGetCompetition,
  getCompetitionStatsAdmin,
} from '../controllers/competitionController';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/report-cards', listStudentReports);
router.post('/report-cards', createReportCardForUser);
router.post('/report-cards/regenerate', createReportCardForUser);
router.get('/report-cards/:id', getReportCard);
router.delete('/report-cards/:id', deleteReportCard);
router.put('/report-cards/settings', updateReportSettings);

router.get('/document-requests', listDocumentRequests);
router.post('/document-requests/:id/approve', approveDocumentRequest);
router.post('/document-requests/:id/reject', rejectDocumentRequest);

router.get('/students/:id/results', getStudentResults);
router.get('/students/:id', getStudentDetail);
router.delete('/students/:id', deleteStudent);
router.get('/quizzes', getAllQuizzes);
router.get('/documents', getAllDocuments);

router.get('/dashboard', getDashboardStats);
router.get('/students', getStudents);
router.get('/analytics', getFullAnalytics);
router.get('/subject-counts', getSubjectQuestionCounts);
router.get('/command-center', getCommandCenter);
router.delete('/questions/bank', clearQuestionBank);

router.get('/competitions', listCompetitionsAdmin);
router.get('/competitions/stats', getCompetitionStatsAdmin);
router.get('/competitions/:id', adminGetCompetition);

export default router;

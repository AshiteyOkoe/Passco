import { Router } from 'express';
import { saveAttempt, getAttempt, deleteAttempt, logAttemptEvent, getInProgressAttempts } from '../controllers/quizAttemptController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/save', saveAttempt);
router.get('/in-progress', getInProgressAttempts);
router.get('/:quizId', getAttempt);
router.delete('/:quizId', deleteAttempt);
router.post('/events', logAttemptEvent);

export default router;

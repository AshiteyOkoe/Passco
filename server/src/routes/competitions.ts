import { Router } from 'express';
import {
  searchParticipants,
  createCompetition,
  getMyCompetitions,
  getCompetition,
  acceptCompetition,
  declineCompetition,
  startCompetition,
  startSession,
  submitCompetition,
  abandonCompetition,
  cancelCompetition,
} from '../controllers/competitionController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/participants/search', searchParticipants);
router.get('/mine', getMyCompetitions);
router.post('/', createCompetition);
router.get('/:id', getCompetition);
router.post('/:id/accept', acceptCompetition);
router.post('/:id/decline', declineCompetition);
router.post('/:id/start', startCompetition);
router.post('/:id/start-session', startSession);
router.post('/:id/submit', submitCompetition);
router.post('/:id/abandon', abandonCompetition);
router.post('/:id/cancel', cancelCompetition);

export default router;
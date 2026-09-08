import { Router } from 'express';
import { getPlatformStats } from '../controllers/statsController';

const router = Router();

router.get('/', getPlatformStats);

export default router;
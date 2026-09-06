import { Router } from 'express';
import { getAuditLogs, getAuditStats } from '../controllers/auditController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireAdmin, getAuditLogs);
router.get('/stats', authenticate, requireAdmin, getAuditStats);

export default router;

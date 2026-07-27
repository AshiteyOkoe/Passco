import { Router } from 'express';
import { getAnnouncements, createAnnouncement, deleteAnnouncement, getAllAnnouncements } from '../controllers/announcementController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getAnnouncements);
router.get('/admin/all', authenticate, requireAdmin, getAllAnnouncements);
router.post('/', authenticate, requireAdmin, createAnnouncement);
router.delete('/:id', authenticate, requireAdmin, deleteAnnouncement);

export default router;

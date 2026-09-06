import { Router } from 'express';
import {
  getApprovedTestimonials,
  getAllTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from '../controllers/testimonialController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', getApprovedTestimonials);
router.get('/all', authenticate, requireAdmin, getAllTestimonials);
router.post('/', authenticate, requireAdmin, createTestimonial);
router.put('/:id', authenticate, requireAdmin, updateTestimonial);
router.delete('/:id', authenticate, requireAdmin, deleteTestimonial);

export default router;
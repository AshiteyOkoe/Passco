import { Router } from 'express';
import { parseUploadedFile, saveBulkQuestions, getBulkUploads } from '../controllers/bulkUploadController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.post('/parse', upload.single('file'), parseUploadedFile);
router.post('/save', saveBulkQuestions);
router.get('/', getBulkUploads);

export default router;

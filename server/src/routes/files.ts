import { Router } from 'express';
import { uploadFile, processFile, getDocuments, getDocumentById, deleteDocument } from '../controllers/fileController';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { requirePremiumFeature } from '../services/subscriptionService';

const router = Router();

router.use(authenticate);

router.post('/upload', upload.single('file'), requirePremiumFeature('documentUploads'), uploadFile);
router.post('/:documentId/process', requirePremiumFeature('documentUploads'), processFile);
router.get('/', getDocuments);
router.get('/:documentId', getDocumentById);
router.delete('/:documentId', deleteDocument);

export default router;

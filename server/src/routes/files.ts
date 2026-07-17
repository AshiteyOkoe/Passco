import { Router } from 'express';
import { uploadFile, processFile, getDocuments, getDocumentById, deleteDocument } from '../controllers/fileController';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.post('/upload', upload.single('file'), uploadFile);
router.post('/:documentId/process', processFile);
router.get('/', getDocuments);
router.get('/:documentId', getDocumentById);
router.delete('/:documentId', deleteDocument);

export default router;

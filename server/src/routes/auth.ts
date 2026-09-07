import { Router } from 'express';
import {
  register, login, getProfile, updateProfile, uploadAvatar,
  changePassword, revokeSessions, deactivateAccount, deleteAccount,
} from '../controllers/authController';
import { googleAuth, googleCallback } from '../controllers/googleAuthController';
import { authenticate } from '../middleware/auth';
import multer from 'multer';

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.delete('/profile', authenticate, deleteAccount);
router.post('/avatar', authenticate, avatarUpload.single('avatar'), uploadAvatar);
router.post('/change-password', authenticate, changePassword);
router.post('/revoke-sessions', authenticate, revokeSessions);
router.post('/deactivate', authenticate, deactivateAccount);

export default router;

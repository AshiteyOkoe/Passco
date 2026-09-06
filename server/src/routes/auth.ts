import { Router } from 'express';
import {
  register, login, getProfile, updateProfile, uploadAvatar,
  changePassword, revokeSessions, deactivateAccount, deleteAccount,
} from '../controllers/authController';
import { googleAuth, googleCallback } from '../controllers/googleAuthController';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const avatarDir = path.join(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `avatar-${crypto.randomUUID()}${ext}`);
    },
  }),
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

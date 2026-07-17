import { Router } from 'express';
import { register, login, getProfile, updateProfile, uploadAvatar } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const avatarDir = path.join(process.cwd(), 'uploads', 'avatars');
import fs from 'fs';
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${crypto.randomUUID()}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/avatar', authenticate, avatarUpload.single('avatar'), uploadAvatar);

export default router;

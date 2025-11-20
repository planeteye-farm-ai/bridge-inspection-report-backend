import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  changePassword,
  login,
  refresh,
  requestPasswordReset,
  resetPassword,
  signup,
} from '../controllers/authController.js';

const router = express.Router();

router.post('/api/auth/signup', signup);
router.post('/api/auth/login', login);
router.post('/api/auth/refresh', refresh);
router.post('/api/auth/password/reset-request', requestPasswordReset);
router.post('/api/auth/password/reset-confirm', resetPassword);
router.post('/api/auth/password/change', authenticate, changePassword);

export default router;


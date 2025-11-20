import express from 'express';
import { authenticate, requireRoles } from '../middleware/auth.js';
import {
  activateUser,
  assignUserRole,
  createUserController,
  deactivateUser,
  deleteUserController,
  getUsers,
  updateUserController,
} from '../controllers/userController.js';

const router = express.Router();

router.use(authenticate, requireRoles('admin', 'manager'));

router.get('/api/admin/users', getUsers);
router.post('/api/admin/users', requireRoles('admin'), createUserController);
router.patch('/api/admin/users/:id', requireRoles('admin'), updateUserController);
router.delete('/api/admin/users/:id', requireRoles('admin'), deleteUserController);
router.post('/api/admin/users/:id/activate', requireRoles('admin'), activateUser);
router.post('/api/admin/users/:id/deactivate', requireRoles('admin'), deactivateUser);
router.post('/api/admin/users/:id/role', requireRoles('admin'), assignUserRole);

export default router;


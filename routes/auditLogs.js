import express from 'express';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { getAuditLogs } from '../controllers/auditController.js';

const router = express.Router();

router.use(authenticate, requireRoles('admin'));

router.get('/api/admin/logs', getAuditLogs);

export default router;


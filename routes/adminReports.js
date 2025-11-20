import express from 'express';
import { authenticate, requireRoles } from '../middleware/auth.js';
import {
  downloadReport,
  getReports,
  patchReport,
  removeReport,
  syncInspection,
} from '../controllers/reportController.js';

const router = express.Router();

router.use(authenticate, requireRoles('admin', 'manager'));

router.get('/api/admin/reports', getReports);
router.patch('/api/admin/reports/:id', patchReport);
router.delete('/api/admin/reports/:id', requireRoles('admin'), removeReport);
router.post('/api/admin/reports/:id/download', downloadReport);
router.post('/api/admin/reports/inspections/:inspectionId/sync', syncInspection);

export default router;


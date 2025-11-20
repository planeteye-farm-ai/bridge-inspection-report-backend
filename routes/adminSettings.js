import express from 'express';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { getSettings, putSetting, triggerBackup } from '../controllers/settingsController.js';

const router = express.Router();

router.use(authenticate, requireRoles('admin'));

router.get('/api/admin/settings', getSettings);
router.put('/api/admin/settings', putSetting);
router.post('/api/admin/settings/backup', triggerBackup);

export default router;


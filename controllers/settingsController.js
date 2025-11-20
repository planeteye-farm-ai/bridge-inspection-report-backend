import pool from '../config/database.js';
import { recordAuditLog } from '../services/auditService.js';
import { getAllSettings, updateSetting } from '../services/settingsService.js';

export const getSettings = async (_req, res) => {
  try {
    const settings = await getAllSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error('[SETTINGS_CONTROLLER] Error in getSettings:', err);
    throw err;
  }
};

export const putSetting = async (req, res) => {
  try {
    const { key, value, description } = req.body;
    if (!key) {
      return res.status(400).json({ success: false, error: 'Key is required' });
    }
    const setting = await updateSetting(key, value, description, req.user.id);
    await recordAuditLog({
      actorId: req.user.id,
      action: 'update_setting',
      entity: 'setting',
      entityId: key,
      metadata: { value },
    });
    res.json({ success: true, data: setting });
  } catch (err) {
    console.error('[SETTINGS_CONTROLLER] Error in putSetting:', err);
    throw err;
  }
};

export const triggerBackup = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
        INSERT INTO system_backups (initiated_by, status, notes)
        VALUES ($1, 'queued', $2)
        RETURNING *
      `,
      [req.user.id, req.body.notes || null]
    );
    await recordAuditLog({
      actorId: req.user.id,
      action: 'trigger_backup',
      entity: 'system_backup',
      entityId: rows[0].id,
    });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[SETTINGS_CONTROLLER] Error in triggerBackup:', err);
    throw err;
  }
};


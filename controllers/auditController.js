import { fetchAuditLogs } from '../services/auditService.js';

export const getAuditLogs = async (req, res) => {
  try {
    const logs = await fetchAuditLogs({
      limit: Number(req.query.limit) || 50,
      offset: Number(req.query.offset) || 0,
      actorId: req.query.actorId,
      action: req.query.action,
    });
    res.json({ success: true, data: logs });
  } catch (err) {
    console.error('[AUDIT_CONTROLLER] Error in getAuditLogs:', err);
    throw err;
  }
};


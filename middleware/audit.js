import { recordAuditLog } from '../services/auditService.js';

export const auditAction =
  (action, entityProvider = () => ({})) =>
  async (req, res, next) => {
    res.on('finish', async () => {
      if (!req.user) return;
      const { entity, entityId, metadata } = entityProvider(req) || {};
      await recordAuditLog({
        actorId: req.user.id,
        action,
        entity,
        entityId,
        metadata: metadata ?? {},
        statusCode: res.statusCode,
      });
    });
    next();
  };


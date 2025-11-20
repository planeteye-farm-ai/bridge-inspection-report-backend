import pool from '../config/database.js';

export const recordAuditLog = async ({ actorId, action, entity, entityId, metadata = {}, statusCode }) => {
  try {
    await pool.query(
      `
        INSERT INTO audit_logs (actor_id, action, entity, entity_id, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [actorId, action, entity || null, entityId || null, { ...metadata, statusCode }]
    );
  } catch (err) {
    console.error('[AUDIT] Failed to record log:', err.message);
  }
};

export const fetchAuditLogs = async ({ limit = 50, offset = 0, actorId, action }) => {
  const filters = [];
  const params = [];

  if (actorId) {
    params.push(actorId);
    filters.push(`actor_id = $${params.length}`);
  }

  if (action) {
    params.push(`%${action}%`);
    filters.push(`action ILIKE $${params.length}`);
  }

  params.push(limit);
  params.push(offset);

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `
      SELECT al.*, u.email AS actor_email
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params
  );

  return rows;
};


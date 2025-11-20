import pool from '../config/database.js';

export const listReports = async ({ status, type, q, limit = 20, offset = 0 }) => {
  const filters = [];
  const params = [];

  if (status) {
    params.push(status);
    filters.push(`r.status = $${params.length}`);
  }

  if (type) {
    params.push(type);
    filters.push(`r.type = $${params.length}`);
  }

  if (q) {
    params.push(`%${q}%`);
    filters.push(`(LOWER(r.title) LIKE LOWER($${params.length}) OR LOWER(u.name) LIKE LOWER($${params.length}))`);
  }

  params.push(limit);
  params.push(offset);

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `
      SELECT r.*, u.name AS owner_name, u.email AS owner_email
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      ${whereClause}
      ORDER BY r.updated_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params
  );

  return rows;
};

export const updateReport = async (reportId, payload) => {
  const fields = [];
  const params = [];
  let idx = 1;

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    fields.push(`${key} = $${idx}`);
    params.push(value);
    idx += 1;
  }

  if (!fields.length) return null;

  params.push(reportId);

  const { rows } = await pool.query(
    `
      UPDATE reports
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${params.length}
      RETURNING *
    `,
    params
  );

  return rows[0];
};

export const deleteReport = async (reportId) => {
  await pool.query('DELETE FROM reports WHERE id = $1', [reportId]);
};

export const createReportFromInspection = async (inspectionId) => {
  const { rows } = await pool.query('SELECT * FROM inspections WHERE id = $1', [inspectionId]);
  if (!rows.length) {
    throw new Error('Inspection not found');
  }
  const inspection = rows[0];
  const { rows: inserted } = await pool.query(
    `
      INSERT INTO reports (inspection_id, user_id, title, type, status, summary, metadata)
      VALUES ($1, $2, COALESCE($3, CONCAT(UPPER($4), ' Report')), $4, $5, $6, $7)
      RETURNING *
    `,
    [
      inspection.id,
      inspection.user_id,
      inspection.title,
      inspection.type,
      inspection.status || 'draft',
      inspection.data.summary || null,
      inspection.data,
    ]
  );
  return inserted[0];
};


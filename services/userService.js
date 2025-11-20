import pool from '../config/database.js';

export const listUsers = async ({ search, status, role, limit = 20, offset = 0 }) => {
  const filters = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    filters.push(`(LOWER(name) LIKE LOWER($${params.length}) OR LOWER(email) LIKE LOWER($${params.length}))`);
  }

  if (status) {
    params.push(status);
    filters.push(`status = $${params.length}`);
  }

  if (role) {
    params.push(role);
    filters.push(`role = $${params.length}`);
  }

  params.push(limit);
  params.push(offset);

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `
      SELECT id, email, name, role, status, last_login_at, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params
  );

  return rows;
};

export const createUser = async ({ name, email, passwordHash, role = 'inspector', status = 'active' }) => {
  const { rows } = await pool.query(
    `
      INSERT INTO users (name, email, password, role, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, role, status, created_at
    `,
    [name, email, passwordHash, role, status]
  );
  return rows[0];
};

export const updateUser = async (userId, payload) => {
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

  params.push(userId);

  const { rows } = await pool.query(
    `
      UPDATE users
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${params.length}
      RETURNING id, name, email, role, status, updated_at
    `,
    params
  );

  return rows[0];
};

export const deleteUser = async (userId) => {
  await pool.query('DELETE FROM users WHERE id = $1', [userId]);
};

export const assignRole = async (userId, role) => {
  const { rows } = await pool.query(
    `
      UPDATE users
      SET role = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, name, email, role, status
    `,
    [role, userId]
  );
  return rows[0];
};


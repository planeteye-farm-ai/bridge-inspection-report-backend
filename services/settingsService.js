import pool from '../config/database.js';

export const getAllSettings = async () => {
  const { rows } = await pool.query('SELECT key, value, description, updated_at FROM settings ORDER BY key ASC');
  return rows;
};

export const updateSetting = async (key, value, description, userId) => {
  const { rows } = await pool.query(
    `
      INSERT INTO settings (key, value, description, updated_by, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value,
                    description = EXCLUDED.description,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = NOW()
      RETURNING key, value, description, updated_at
    `,
    [key, value, description, userId]
  );

  return rows[0];
};


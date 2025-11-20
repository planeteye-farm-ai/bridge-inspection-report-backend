import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_TTL || '30m';
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_TTL || '7d';

const accessSecret = process.env.JWT_SECRET || 'bridge-access-secret';
const refreshSecret = process.env.JWT_REFRESH_SECRET || accessSecret;

export const signAccessToken = (payload) =>
  jwt.sign(payload, accessSecret, { expiresIn: ACCESS_TOKEN_TTL });

export const signRefreshToken = (payload) =>
  jwt.sign(payload, refreshSecret, { expiresIn: REFRESH_TOKEN_TTL });

export const verifyAccessToken = (token) => jwt.verify(token, accessSecret);

export const verifyRefreshToken = (token) => jwt.verify(token, refreshSecret);


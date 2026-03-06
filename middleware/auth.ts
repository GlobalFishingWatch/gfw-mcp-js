import express from 'express';

export const API_KEY = process.env.API_KEY;
const AUTH_REQUIRED = !!API_KEY;

export const authenticate = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (!AUTH_REQUIRED) {
    return next();
  }

  const authHeader = req.headers.authorization;
  let providedKey: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7);
  } else {
    providedKey = req.headers['x-api-key'] as string | undefined;
  }

  if (!providedKey || providedKey !== API_KEY) {
    return res.status(401).json({
      error: 'Unauthorized',
      message:
        'Invalid or missing API key. Provide it via Authorization: Bearer <key> or X-API-Key header.',
    });
  }

  next();
};

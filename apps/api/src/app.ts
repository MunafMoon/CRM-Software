import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { config } from './config.js';
import { db } from './db.js';
import { authRouter } from './routes/auth.js';
import { crmRouter } from './routes/crm.js';
import { asyncHandler, errorHandler } from './middleware/errors.js';
export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(
  '/api',
  rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please wait a minute.' },
  }),
);
app.get(
  '/api/health',
  asyncHandler(async (_req, res) => {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  }),
);
app.use('/api/auth', authRouter);
app.use('/api', crmRouter);
app.use((_req, res) => res.status(404).json({ error: 'Endpoint not found' }));
app.use(errorHandler);
export default app;

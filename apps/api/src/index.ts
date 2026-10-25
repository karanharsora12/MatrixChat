import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { contactsRouter } from './modules/contacts/contacts.routes.js';
import { conversationsRouter } from './modules/conversations/conversations.routes.js';
import { messagesRouter } from './modules/messages/messages.routes.js';
import { uploadsRouter } from './modules/uploads/uploads.routes.js';
import { setupSocketServer } from './sockets/index.js';
import { createRateLimiter } from './middleware/rateLimiter.js';

const app = express();
const server = http.createServer(app);

const PORT = parseInt(process.env.PORT || '5000', 10);
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// 1. Security & Core Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-token'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 2. Static File Serving for Attachments
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadDir));

// 3. Global Rate Limiter for Auth Routes
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many authentication attempts from this IP. Please try again later.',
});

// 4. API Routes
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/users', usersRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api', messagesRouter);
app.use('/api/uploads', uploadsRouter);

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'matrixchat-api', timestamp: new Date() });
});

// 5. Socket.IO Setup
const io = new SocketIOServer(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 25000,
});

setupSocketServer(io);

// 6. Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Unhandled API Error]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
  });
});

// 7. Start Server
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 MatrixChat API Server running on port ${PORT}`);
  console.log(`🌐 Client Origin: ${CLIENT_URL}`);
  console.log(`📦 Database: Connected`);
  console.log(`⚡ Real-Time Socket.IO: Initialized`);
  console.log(`=======================================================`);
});

export { app, server, io };

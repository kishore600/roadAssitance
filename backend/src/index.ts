// server/index.js or app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import http from 'http';
import { Server } from 'socket.io';
import { env } from './config/env';
import { servicesRouter } from './routes/services.routes';
import { bookingsRouter } from './routes/bookings.routes';
import { mechanicsRouter } from './routes/mechanics.routes';
import { initSocket } from './socket';
import cookieParser from 'cookie-parser';
import { authMiddleware } from './middleware/auth';
import { authRouter } from './routes/auth.routes';
import savedLocationRouter from './routes/savedLocations.routes';

const app = express();
app.use(cookieParser());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    credentials: true
  }
});

// Initialize socket with all event handlers
initSocket(io);

app.use(cors({ origin: '*', credentials: true }));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't crash the server, just log it
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't crash the server, just log it
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'roadside-assistance-api' });
});

app.use('/api/services', servicesRouter);
app.use('/api/auth', authRouter);
app.use('/api/bookings', authMiddleware, bookingsRouter);
app.use('/api/mechanics', authMiddleware, mechanicsRouter);
app.use('/api/location', authMiddleware, savedLocationRouter);

server.listen(env.port, () => {
  console.log(`API running on http://localhost:${env.port}`);
});
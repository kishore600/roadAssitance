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

const app = express();
app.use(cookieParser());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

initSocket(io);

app.use(cors({ origin: '*' }));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'roadside-assistance-api' });
});

app.use('/services', servicesRouter);
app.use('/auth', authRouter);
app.use('/bookings',authMiddleware, bookingsRouter);
app.use('/mechanics',authMiddleware, mechanicsRouter);

server.listen(env.port, () => {
  console.log(`API running on http://localhost:${env.port}`);
});

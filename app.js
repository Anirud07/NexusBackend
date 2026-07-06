import express from 'express';

import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';

// Routes
import authRoutes from './routes/auth.js';
import friendRoutes from './routes/friends.js';
import messageRoutes from './routes/messages.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);


const allowedOrigins = [
  "https://nexus-frontend-fawn.vercel.app",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

// Socket.io Server Setup
const io = new Server(server, {
  cors: corsOptions,
});

// Map of userId -> socketId
const userSockets = new Map();

app.set('socketio', io);
app.set('userSockets', userSockets);

// Middleware
app.use(helmet());

// CORS configuration to allow credentials (cookie token)
app.use(cors(corsOptions));

app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 10000 : 500, // higher limit in dev to allow polling/searching
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api/', limiter);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/messages', messageRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('Slate Chat API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log('A client connected:', socket.id);

  socket.on('setup', (userId) => {
    userSockets.set(userId, socket.id);
    socket.join(userId);
    console.log(`User ${userId} joined room/registered socket ${socket.id}`);
  });

  socket.on('joinChat', (room) => {
    socket.join(room);
    console.log(`User joined chat room: ${room}`);
  });

  socket.on('disconnect', () => {
    for (let [userId, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(userId);
        console.log(`User ${userId} socket disconnected`);
        break;
      }
    }
  });
});

// Connect to Database and start Server
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/slatechat';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

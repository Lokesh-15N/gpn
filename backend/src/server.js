import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import sequelize from './config/database.js';
import { connectRedis } from './config/redis.js';
import { initializeWebSocket } from './websocket.js';

// Import routes
import authRoutes from './routes/auth.js';
import tokenRoutes from './routes/tokens.js';
import doctorRoutes from './routes/doctors.js';
import adminRoutes from './routes/admin.js';
import departmentRoutes from './routes/departments.js';
import hospitalRoutes from './routes/hospitals.js';

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize WebSocket
const io = initializeWebSocket(server);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: true, // Allow all origins for local network access
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Rate limit exceeded'
    }
  }
});

app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'OPD Orchestration API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
const API_VERSION = process.env.API_VERSION || 'v1';
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/tokens`, tokenRoutes);
app.use(`/api/${API_VERSION}/doctors`, doctorRoutes);
app.use(`/api/${API_VERSION}/admin`, adminRoutes);
app.use(`/api/${API_VERSION}/departments`, departmentRoutes);
app.use(`/api/${API_VERSION}/hospitals`, hospitalRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Internal server error'
    }
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Sync models (development only - use migrations in production)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synchronized');
    }

    // Connect to Redis
    await connectRedis();

    // Start server
    server.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🏥 OPD Orchestration System API                        ║
║                                                           ║
║   Server running on: http://localhost:${PORT}              ║
║   Environment: ${process.env.NODE_ENV || 'development'}     ║
║   API Version: ${API_VERSION}                             ║
║                                                           ║
║   WebSocket: Connected ✅                                  ║
║   Database: Connected ✅                                   ║
║   Redis: Connected ✅                                      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing server...');
  server.close(async () => {
    await sequelize.close();
    process.exit(0);
  });
});

export default app;

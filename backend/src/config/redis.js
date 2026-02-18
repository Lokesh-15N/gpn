import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Mock Redis client for development without Redis
const mockRedis = {
  get: async () => null,
  set: async () => 'OK',
  setEx: async () => 'OK',
  del: async () => 1,
  quit: async () => 'OK',
  connect: async () => {},
  isOpen: true
};

let redisClient;
let useRealRedis = process.env.REDIS_HOST || process.env.USE_REDIS === 'true';

if (useRealRedis) {
  redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    },
    password: process.env.REDIS_PASSWORD || undefined
  });

  redisClient.on('error', (err) => {
    console.warn('⚠️  Redis Client Error:', err.message);
    console.warn('⚠️  Falling back to mock Redis (no caching)');
  });

  redisClient.on('connect', () => console.log('✅ Redis connected'));
} else {
  console.log('ℹ️  Using mock Redis (caching disabled) - Set REDIS_HOST to enable');
  redisClient = mockRedis;
}

export const connectRedis = async () => {
  if (useRealRedis) {
    try {
      await redisClient.connect();
    } catch (error) {
      console.warn('⚠️  Failed to connect to Redis:', error.message);
      console.warn('⚠️  Falling back to mock Redis (no caching)');
      redisClient = mockRedis;
    }
  }
};

export default redisClient;

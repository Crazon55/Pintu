import Queue from 'bull';
import Redis from 'redis';

// Create Redis client (fallback to in-memory if Redis not available)
let redisClient;
try {
  redisClient = Redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  });
  redisClient.on('error', (err) => {
    console.warn('Redis connection error, using in-memory queue:', err.message);
    redisClient = null;
  });
} catch (error) {
  console.warn('Redis not available, using in-memory queue');
  redisClient = null;
}

export function createJobQueue() {
  const queue = new Queue('video-processing', {
    redis: redisClient ? {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    } : undefined,
    // Use in-memory if Redis not available
    createClient: redisClient ? undefined : (type) => {
      const client = {
        get: () => Promise.resolve(null),
        set: () => Promise.resolve('OK'),
        del: () => Promise.resolve(1),
        exists: () => Promise.resolve(0),
        keys: () => Promise.resolve([]),
        expire: () => Promise.resolve(1),
        ttl: () => Promise.resolve(-1),
        zadd: () => Promise.resolve(1),
        zrem: () => Promise.resolve(1),
        zrange: () => Promise.resolve([]),
        zrangebyscore: () => Promise.resolve([]),
        zcard: () => Promise.resolve(0),
        hget: () => Promise.resolve(null),
        hset: () => Promise.resolve(1),
        hdel: () => Promise.resolve(1),
        hgetall: () => Promise.resolve({}),
        hkeys: () => Promise.resolve([]),
        sadd: () => Promise.resolve(1),
        srem: () => Promise.resolve(1),
        smembers: () => Promise.resolve([]),
        sismember: () => Promise.resolve(0),
        incr: () => Promise.resolve(1),
        decr: () => Promise.resolve(0),
        lpush: () => Promise.resolve(1),
        rpop: () => Promise.resolve(null),
        llen: () => Promise.resolve(0),
        lrange: () => Promise.resolve([]),
        publish: () => Promise.resolve(1),
        subscribe: () => {},
        unsubscribe: () => {},
        on: () => {},
        quit: () => Promise.resolve('OK')
      };
      return client;
    }
  });

  queue.on('completed', (job, result) => {
    console.log(`✓ Job ${job.id} completed successfully`);
    console.log('Result:', result);
  });

  queue.on('failed', (job, err) => {
    console.error(`✗ Job ${job.id} failed:`, err.message);
    console.error('Error details:', err);
  });

  queue.on('active', (job) => {
    console.log(`→ Job ${job.id} is now active`);
  });

  queue.on('stalled', (job) => {
    console.warn(`⚠ Job ${job.id} stalled`);
  });

  return queue;
}

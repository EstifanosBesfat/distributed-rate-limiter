const redisClient = require('../config/redis');

const WINDOW_SIZE_IN_SECONDS = 60;
const MAX_WINDOW_REQUESTS = 10;
const WINDOW_LOG_INTERVAL_IN_MS = WINDOW_SIZE_IN_SECONDS * 1000;

const rateLimiter = async (req, res, next) => {
    try {
        const ip = req.headers['x-real-ip'] || req.socket.remoteAddress;
        const key = `rate_limit:${ip}`;
        const currentTimestamp = Date.now();
        
        // 1. CLEAN: Remove timestamps older than the window (e.g., older than 60s ago)
        // Syntax: zRemRangeByScore(key, min, max)
        const windowStart = currentTimestamp - WINDOW_LOG_INTERVAL_IN_MS;
        await redisClient.zRemRangeByScore(key, 0, windowStart);

        // 2. COUNT: Get the number of requests currently in the window
        // Syntax: zCard(key)
        const requestCount = await redisClient.zCard(key);

        // 3. CHECK: If we are already full, block immediately
        if (requestCount >= MAX_WINDOW_REQUESTS) {
            return res.status(429).json({
                error: 'Too Many Requests',
                message: `You exceeded the limit of ${MAX_WINDOW_REQUESTS} requests per minute.`
            });
        }

        // 4. ADD: If we are allowed, add the current request
        // Syntax: zAdd(key, { score: number, value: string })
        // Remember: 'value' must be unique!
        await redisClient.zAdd(key, {
            score: currentTimestamp,
            value: `${currentTimestamp}-${Math.random()}`
        });

        // 5. EXPIRE: Reset the expiry so the key doesn't live forever in Redis
        await redisClient.expire(key, WINDOW_SIZE_IN_SECONDS);

        next();

    } catch (error) {
        console.error("Rate Limiter Error:", error);
        next();
    }
};

module.exports = rateLimiter;
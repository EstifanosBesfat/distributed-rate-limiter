const fs = require('fs');
const path = require('path');
const redisClient = require('../config/redis');

// 1. Load the Lua Script into memory (Read it once when server starts)
const LUA_SCRIPT = fs.readFileSync(path.join(__dirname, 'rateLimiter.lua'), 'utf8');

const WINDOW_SIZE_IN_SECONDS = 60;
const MAX_WINDOW_REQUESTS = 10;
const WINDOW_LOG_INTERVAL_IN_MS = WINDOW_SIZE_IN_SECONDS * 1000;

const rateLimiter = async (req, res, next) => {
    try {
        const ip = req.headers['x-real-ip'] || req.socket.remoteAddress;
        const key = `rate_limit:${ip}`;
        const currentTimestamp = Date.now().toString(); // Lua needs strings
        const uniqueId = Math.random().toString();
        
        // 2. Execute the Script Atomically
        // eval(script, { keys: [], arguments: [] })
        const result = await redisClient.eval(LUA_SCRIPT, {
            keys: [key],
            arguments: [
                currentTimestamp,           // ARGV[1]
                WINDOW_LOG_INTERVAL_IN_MS.toString(), // ARGV[2]
                MAX_WINDOW_REQUESTS.toString(),       // ARGV[3]
                uniqueId                    // ARGV[4]
            ]
        });

        // 3. Check Result (1 = Allowed, 0 = Blocked)
        if (result === 0) {
            return res.status(429).json({
                error: 'Too Many Requests',
                message: `You have exceeded the ${MAX_WINDOW_REQUESTS} requests per minute limit.`
            });
        }

        // Allowed!
        next();

    } catch (error) {
        console.error("Rate Limiter Error:", error);
        next(); // Fail open
    }
};

module.exports = rateLimiter;
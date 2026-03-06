const fs = require('fs');
const path = require('path');
const redisClient = require('../config/redis');
const { API_KEYS, DEFAULT_LIMIT } = require('../config/tiers'); // <--- Import Config

const LUA_SCRIPT = fs.readFileSync(path.join(__dirname, 'rateLimiter.lua'), 'utf8');
const WINDOW_LOG_INTERVAL_IN_MS = 60 * 1000; // 60 Seconds

const rateLimiter = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];
        
        // --- DYNAMIC CONFIGURATION LOGIC ---
        let limit;
        let redisKey;

        if (apiKey && API_KEYS[apiKey]) {
            // SCENARIO A: Valid API Key
            limit = API_KEYS[apiKey].limit;
            redisKey = `rate_limit:api:${apiKey}`; // Track by Key
        } else {
            // SCENARIO B: Anonymous / Invalid Key
            const ip = req.headers['x-real-ip'] || req.socket.remoteAddress;
            limit = DEFAULT_LIMIT;
            redisKey = `rate_limit:ip:${ip}`; // Track by IP
        }
        // -----------------------------------

        const currentTimestamp = Date.now().toString();
        const uniqueId = Math.random().toString();

        // Pass the DYNAMIC 'limit' to Lua
        const result = await redisClient.eval(LUA_SCRIPT, {
            keys: [redisKey],
            arguments: [
                currentTimestamp,           
                WINDOW_LOG_INTERVAL_IN_MS.toString(), 
                limit.toString(), // <--- This used to be hardcoded 10
                uniqueId                    
            ]
        });

        if (result === 0) {
            return res.status(429).json({
                error: 'Too Many Requests',
                message: `You have exceeded your limit of ${limit} requests per minute. Upgrade your tier for more.`
            });
        }

        // Add headers so the user knows what their limit is
        res.set('X-RateLimit-Limit', limit);
        
        next();

    } catch (error) {
        console.error("Rate Limiter Error:", error);
        next();
    }
};

module.exports = rateLimiter;
const redisClient = require("../config/redis");

const RATE_LIMIT_WINDOW = 60; // 60 seconds
const MAX_REQUESTS = 10;

const rateLimiter = async (req, res, next) => {
  try {
    // identify the user
    // if x-real-ip exists (from Nginx), use it. Otherwise use socket IP.
    const ip = req.headers["x-real-ip"] || req.socket.remoteAddress;

    // create the key
    const key = `rate_limit: ${ip}`;

    // atomic increment
    const requestCount = await redisClient.incr(key);

    // set expiration on the first request
    if (requestCount === 1) {
      await redisClient.expire(key, RATE_LIMIT_WINDOW);
    }

    if (requestCount > MAX_REQUESTS) {
      // get the time remaining so as to tell the user when to retry
      const ttl = await redisClient.ttl(key);

      res.set({
        "X-RateLimit-Limit": MAX_REQUESTS,
        "X-RateLimit-Remaining": 0,
        "Retry-After": ttl,
      });

      return res.status(429).json({
        error: "Too Many Requests",
        message: `You have exceeded the ${MAX_REQUESTS} requests in ${RATE_LIMIT_WINDOW} seconds limit.`,
        retry_after_seconds: ttl,
      });
    }

    res.set({
      "X-RateLimit-Limit": MAX_REQUESTS,
      "X-RateLimit-Remaining": MAX_REQUESTS - requestCount,
    });

    next();
  } catch (error) {
    console.error("Rate Limiter Error: ", error);
    // if redis is down allow the request so legitimate users don't get blocked
    next();
  }
};

module.exports = rateLimiter;

const express = require('express');
const redisClient = require('./config/redis'); // Import the shared client
const rateLimiter = require('./middlewares/rateLimiter'); // Import your new logic

const app = express();
const port = process.env.PORT || 3000;
const instanceId = process.env.INSTANCE_ID || 'Unknown';

// Apply Rate Limiter to ALL routes
app.use(rateLimiter);

app.get('/', async (req, res) => {
    // Just for debug visibility
    const count = await redisClient.get('global_request_count'); 
    
    res.json({
        message: "Request Allowed!",
        handled_by: instanceId,
        global_hits: count
    });
});

app.listen(port, () => {
    console.log(`${instanceId} listening on port ${port}`);
});
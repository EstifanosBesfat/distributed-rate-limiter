const express = require('express');
const Redis = require('redis');

const app = express();
const port = process.env.PORT || 3000;
const instanceId = process.env.INSTANCE_ID || 'Unknown';

// Connect to Redis (Just to prove we can)
const redisClient = Redis.createClient({
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:6379`
});
redisClient.connect().catch(console.error);

app.get('/', async (req, res) => {
    // Increment a global counter in Redis
    const count = await redisClient.incr('global_request_count');
    
    console.log(`[${instanceId}] Handling request. Global Count: ${count}`);
    
    res.json({
        message: "Hello from the Distributed System!",
        handled_by: instanceId,
        global_count: count
    });
});

app.listen(port, () => {
    console.log(`${instanceId} listening on port ${port}`);
});
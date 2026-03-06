-- KEYS[1] = The Rate Limit Key (e.g., rate_limit:127.0.0.1)
-- ARGV[1] = Current Timestamp (in ms)
-- ARGV[2] = Window Size (in ms)
-- ARGV[3] = Max Requests Allowed
-- ARGV[4] = Unique Request ID

local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local unique_id = ARGV[4]

-- 1. CLEAN: Remove old entries
-- We calculate the "min" time to keep. Anything older is deleted.
local clearBefore = now - window
redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)

-- 2. COUNT: How many are left?
local count = redis.call('ZCARD', key)

-- 3. CHECK: Are we allowed?
if count < limit then
    -- YES: Add the new request
    redis.call('ZADD', key, now, unique_id)
    -- Reset expiration (so the key cleans up eventually)
    redis.call('PEXPIRE', key, window)
    return 1 -- Success (Allowed)
else
    -- NO: Block
    return 0 -- Fail (Blocked)
end
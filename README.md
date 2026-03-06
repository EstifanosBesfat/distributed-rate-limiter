# Distributed API Rate Limiter

A scalable, race-condition-free rate limiter for distributed systems.  
It uses **Redis** and **Lua scripts** to enforce request limits atomically across multiple Node.js instances behind a load balancer.

## Architecture

![Architecture](https://img.shields.io/badge/Architecture-Distributed-blue)

- **Load Balancer:** Nginx (round-robin strategy)
- **API Cluster:** 3 Node.js Express servers
- **Shared State:** Redis
- **Algorithm:** Sliding Window Log (atomic Lua script)

## The Problem

In a distributed setup, each API instance has its own memory.  
If you track requests with a local variable (`let count = 0`):

1. Server A allows 10 requests.
2. Server B allows 10 requests.
3. Server C allows 10 requests.

**Result:** one user can send 30 requests while the intended limit is 10.

## The Solution

This project uses Redis as a centralized state store and runs the limiter logic with Lua inside Redis.

- **Atomicity:** check + update happen in one operation.
- **Sliding window:** prevents burst abuse at window boundaries.
- **Tiered limits:** supports different limits for anonymous vs API-key users.

---

## Run + Verify

> Use this section as a quick operator guide.

### Step 1: Start the stack

```bash
docker-compose up --build
```

Services started:
- 1 Redis instance
- 1 Nginx load balancer (port `80`)
- 3 Node.js API instances

### Step 2: Validate anonymous limit

Default anonymous limit is **5 requests/minute**.

```bash
# Run this 6 times; the 6th request should return HTTP 429
curl -i http://localhost
```

### Step 3: Validate Pro API key limit

Pro keys are configured for higher throughput (for example, 50 requests/minute).

```bash
curl -i -H "x-api-key: pro_456" http://localhost
```

### Step 4: Concurrency stress test

```bash
# Fires 20 requests simultaneously
node stress-test.js
```

Expected behavior:
- Allowed requests match configured limit.
- Extra requests are blocked with `429 Too Many Requests`.

### Quick command board

| Goal | Command |
|---|---|
| Build + start cluster | `docker-compose up --build` |
| Anonymous request test | `curl -i http://localhost` |
| Pro key request test | `curl -i -H "x-api-key: pro_456" http://localhost` |
| Race-condition stress test | `node stress-test.js` |

// simulating a database of API keys
const API_KEYS = {
  free_123: { tier: "FREE", limit: 10 },
  pro_456: { tier: "PRO", limit: 100 },
  enterprise_789: { tier: "ENTERPRISE", limit: 100 },
};

const DEFAULT_LIMIT = 5; // if no API key or invalid key

module.exports = { API_KEYS, DEFAULT_LIMIT };

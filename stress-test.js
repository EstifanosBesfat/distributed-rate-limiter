const axios = require('axios');

async function testRaceCondition() {
  const url = "http://localhost"; 

  console.log("🔥 Firing 20 concurrent requests...");

  // Create 20 Promises
  const requests = Array.from({ length: 20 }, (_, i) =>
    axios.get(url) // 1. Use GET to match server
      .then(res => {
        // If successful (200), return the status
        return { id: i, status: res.status };
      })
      .catch(err => {
        // 2. If it fails (429 or 500), return the status anyway
        // Don't crash the loop!
        return { id: i, status: err.response ? err.response.status : 'Network Error' };
      })
  );

  // Wait for ALL of them to finish (Success or Fail)
  const results = await Promise.all(requests);

  // Count the results
  const successCount = results.filter(r => r.status === 200).length;
  const blockedCount = results.filter(r => r.status === 429).length;

  console.log("------------------------------------------------");
  console.log(`✅ Success (200): ${successCount}`);
  console.log(`🛑 Blocked (429): ${blockedCount}`);
  console.log("------------------------------------------------");

  if (successCount > 10) {
      console.log("⚠️  WARNING: Race Condition detected! Too many requests allowed.");
  } else {
      console.log("🏆 SUCCESS: Rate Limiter held perfectly.");
  }
}

testRaceCondition();
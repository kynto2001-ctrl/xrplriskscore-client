// Minimal smoke test that hits the public demo endpoint.
// Does not require a paying seed.

const assert = require("assert");
const { XrplRiskScoreClient, InvalidWalletError } = require("../src");

async function run() {
  const client = new XrplRiskScoreClient();

  // 1) Invalid wallet throws.
  await assert.rejects(
    () => client.demoScore("not-a-wallet"),
    (err) => err instanceof InvalidWalletError
  );

  // 2) Demo endpoint returns wallet + verdict only.
  const result = await client.demoScore("rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh");
  assert.strictEqual(typeof result.wallet, "string");
  assert.ok(["ALLOW", "CHALLENGE", "BLOCK"].includes(result.verdict), `Unexpected verdict: ${result.verdict}`);
  assert.strictEqual(result._demo, true);
  // Must NOT contain full-score fields in the stripped demo.
  assert.strictEqual(result.riskScore, undefined, "demo response should not include riskScore");
  assert.strictEqual(result.breakdown, undefined, "demo response should not include breakdown");
  assert.strictEqual(result.flags, undefined, "demo response should not include flags");

  console.log("✅ All tests passed.");
}

run().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});

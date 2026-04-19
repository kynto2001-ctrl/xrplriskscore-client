// Example: an AI agent about to send a large XRP payment uses /prescore
// as a cheap (0.1 XRP) sanity check on the destination wallet. If the
// verdict is BLOCK, the agent aborts without spending 1 XRP on the full score.

const { XrplRiskScoreClient } = require("../src");

async function shouldPayDestination(client, destination) {
  const pre = await client.prescore(destination);
  if (pre.verdict === "BLOCK") {
    console.log(`❌ prescore BLOCK on ${destination} — aborting.`);
    return false;
  }

  // Destination isn't obviously bad. Get the full analysis for confidence.
  const full = await client.score(destination);
  if (full.verdict === "BLOCK") {
    console.log(`❌ full score BLOCK on ${destination} — aborting.`);
    return false;
  }
  if (full.verdict === "CHALLENGE") {
    console.log(`⚠️  full score CHALLENGE on ${destination} — requiring review.`);
    return false;
  }
  console.log(`✅ ALLOW on ${destination} — proceeding.`);
  return true;
}

async function main() {
  const destination = process.argv[2];
  if (!destination) {
    console.error("Usage: node examples/agent-prepay-check.js <destination-wallet>");
    process.exit(1);
  }

  const client = new XrplRiskScoreClient({ seed: process.env.XRPL_SEED });
  const ok = await shouldPayDestination(client, destination);
  process.exit(ok ? 0 : 1);
}

main().catch(err => {
  console.error(`[${err.code || "ERROR"}] ${err.message}`);
  process.exit(2);
});

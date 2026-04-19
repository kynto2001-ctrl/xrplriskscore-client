// Quickstart: score a wallet end-to-end.
//
// Prereqs:
//   npm install
//   set XRPL_SEED to the family seed of a funded XRPL mainnet wallet
//
// Run:  node examples/quickstart.js r...

const { XrplRiskScoreClient } = require("../src");

async function main() {
  const wallet = process.argv[2];
  if (!wallet) {
    console.error("Usage: node examples/quickstart.js <xrpl-wallet-address>");
    process.exit(1);
  }

  const client = new XrplRiskScoreClient({
    seed: process.env.XRPL_SEED, // paying wallet seed
  });

  console.log(`Scoring ${wallet}...`);
  const result = await client.score(wallet);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error(`[${err.code || "ERROR"}] ${err.message}`);
  process.exit(1);
});

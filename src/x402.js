/**
 * x402 payment flow for XRPL.
 *
 * Given:
 *   - a 402 challenge body from the server
 *   - an xrpl.js Wallet object (the payer)
 *   - an xrpl.js Client connected to mainnet
 *
 * Returns a base64-encoded X-PAYMENT header value ready to send in the retry.
 */
const xrpl = require("xrpl");

/**
 * Convert a UTF-8 string to uppercase hex (for XRPL Memo fields).
 */
function utf8ToHex(str) {
  return Buffer.from(str, "utf8").toString("hex").toUpperCase();
}

/**
 * Build the signed XRPL Payment transaction and return the base64
 * X-PAYMENT header payload.
 *
 * @param {Object} opts
 * @param {Object} opts.accepts       - accepts[0] from the 402 challenge
 * @param {Object} opts.wallet        - xrpl.Wallet (funded payer)
 * @param {Object} opts.client        - connected xrpl.Client
 * @param {Number} opts.x402Version   - from the 402 challenge (should be 2)
 * @returns {Promise<string>}         - base64 string for the X-PAYMENT header
 */
async function buildPaymentHeader({ accepts, wallet, client, x402Version }) {
  const invoiceId = accepts.extra?.invoiceId;
  if (!invoiceId) {
    throw new Error("Missing invoiceId in 402 challenge (accepts[0].extra.invoiceId)");
  }

  const sourceTag = accepts.extra?.sourceTag;

  // Build XRPL Payment tx.
  const tx = {
    TransactionType: "Payment",
    Account:         wallet.address,
    Destination:     accepts.payTo,
    Amount:          accepts.amount, // drops as string
    Memos: [
      {
        Memo: {
          MemoType: utf8ToHex("invoiceId"),
          MemoData: utf8ToHex(invoiceId),
        },
      },
    ],
  };
  if (typeof sourceTag === "number") tx.SourceTag = sourceTag;

  // autofill + sign
  const prepared = await client.autofill(tx);
  const signed   = wallet.sign(prepared);

  // Build the x402 envelope the server expects
  const envelope = {
    x402Version,
    accepted: accepts,
    payload:  { signedTxBlob: signed.tx_blob },
  };

  return Buffer.from(JSON.stringify(envelope), "utf8").toString("base64");
}

module.exports = { buildPaymentHeader };

# @xrplriskscore/client

Official Node.js client for the [xrplriskscore.ai](https://xrplriskscore.ai)
XRPL wallet risk scoring API. Handles the x402 payment flow automatically so
you can get a risk verdict in two lines.

## Install

    npm install @xrplriskscore/client xrpl

## Free demo (verdict only)

    const { XrplRiskScoreClient } = require("@xrplriskscore/client");

    const client = new XrplRiskScoreClient();
    const result = await client.demoScore("rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh");
    console.log(result);
    // { wallet: "rHb9CJ...", verdict: "ALLOW", _demo: true, _note: "...", _upgrade: "..." }

Demo is rate-limited to 3 calls per IP per 24h and returns **verdict only** —
no risk score, flags, or reasoning.

## Full API (requires a funded XRPL wallet)

Pass the family seed of a wallet with enough XRP to cover the per-request fee:

    const client = new XrplRiskScoreClient({ seed: process.env.XRPL_SEED });

    const result = await client.score("rHb9CJ...");
    // returns full 21-signal analysis

## Methods

| Method                        | Price     | Returns                                     |
|-------------------------------|-----------|---------------------------------------------|
| `score(wallet)`               | 1 XRP     | Full 21-signal risk analysis                |
| `prescore(wallet)`            | 0.1 XRP   | Fast 3-signal pre-check                     |
| `rwaCheck(wallet)`            | 0.5 XRP   | RWA compliance check                        |
| `credentialCheck(wallet)`     | 0.5 XRP   | Permissioned Domain credential screening    |
| `escrowCheck(wallet)`         | 0.5 XRP   | XLS-85 escrow counterparty screening        |
| `scoreBatch(wallets, opts?)`  | 8–40 XRP  | Batch 1–50 wallets, 20% off (tiered)        |
| `demoScore(wallet)`           | Free      | Verdict only, 3/IP/24h                      |
| `demoPrescore(wallet)`        | Free      | Verdict only, 3/IP/24h                      |
| `demoRwaCheck(wallet)`        | Free      | Verdict only, 3/IP/24h                      |
| `demoCredentialCheck(wallet)` | Free      | Verdict only, 3/IP/24h                      |
| `demoEscrowCheck(wallet)`     | Free      | Verdict only, 3/IP/24h                      |

## Error handling

    const { PaymentRequiredError, InvalidWalletError } = require("@xrplriskscore/client");

    try {
      await client.score(wallet);
    } catch (err) {
      if (err instanceof PaymentRequiredError) { /* payment rejected / underfunded */ }
      if (err instanceof InvalidWalletError)   { /* bad XRPL address */ }
      throw err;
    }

## Protocol

Uses the x402 payment protocol with XRPL as the settlement layer. Each paid
call:

1. Client hits the endpoint.
2. Server responds `402 Payment Required` with a fresh invoiceId.
3. Client builds an XRPL Payment tx embedding the invoiceId in a Memo, signs
   it with its seed, base64-encodes the envelope, and retries with an
   `X-PAYMENT` header.
4. An x402 facilitator verifies the payment and settles on-chain.
5. Server returns the scoring result.

The client handles all of this transparently.

## License

MIT

const xrpl = require("xrpl");
const { buildPaymentHeader } = require("./x402");
const {
  XrplRiskScoreError,
  PaymentRequiredError,
  InvalidWalletError,
  NetworkError,
} = require("./errors");

const DEFAULT_BASE_URL    = "https://xrplriskscore.ai";
const DEFAULT_XRPL_SERVER = "wss://s1.ripple.com";

function isValidXrplAddress(addr) {
  return typeof addr === "string"
      && addr.startsWith("r")
      && addr.length >= 25
      && addr.length <= 35;
}

class XrplRiskScoreClient {
  /**
   * @param {Object} opts
   * @param {string} [opts.seed]        - XRPL family seed of the paying wallet (required for paid endpoints)
   * @param {string} [opts.baseUrl]     - defaults to https://xrplriskscore.ai
   * @param {string} [opts.xrplServer]  - defaults to wss://s1.ripple.com
   */
  constructor(opts = {}) {
    this.seed       = opts.seed || null;
    this.baseUrl    = (opts.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
    this.xrplServer = opts.xrplServer || DEFAULT_XRPL_SERVER;
  }

  // ----- Paid endpoints -----

  score(wallet)            { return this._paidGet("/score",            wallet); }
  prescore(wallet)         { return this._paidGet("/prescore",         wallet); }
  rwaCheck(wallet)         { return this._paidGet("/rwa-check",        wallet); }
  credentialCheck(wallet)  { return this._paidGet("/credential-check", wallet); }
  escrowCheck(wallet)      { return this._paidGet("/escrow-check",     wallet); }

  // ----- Free demo (verdict only) -----

  demoScore(wallet)            { return this._demoGet("/demo/score",            wallet); }
  demoPrescore(wallet)         { return this._demoGet("/demo/prescore",         wallet); }
  demoRwaCheck(wallet)         { return this._demoGet("/demo/rwa-check",        wallet); }
  demoCredentialCheck(wallet)  { return this._demoGet("/demo/credential-check", wallet); }
  demoEscrowCheck(wallet)      { return this._demoGet("/demo/escrow-check",     wallet); }

  // ----- Internal plumbing -----

  async _demoGet(path, wallet) {
    if (!isValidXrplAddress(wallet)) throw new InvalidWalletError(wallet);
    const url = `${this.baseUrl}${path}/${encodeURIComponent(wallet)}`;
    const res = await fetch(url);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new NetworkError(body.error || `HTTP ${res.status}`, res.status);
    return body;
  }

  async _paidGet(path, wallet) {
    if (!isValidXrplAddress(wallet)) throw new InvalidWalletError(wallet);
    if (!this.seed) {
      throw new XrplRiskScoreError(
        "No seed provided. Pass { seed } to the constructor to use paid endpoints.",
        { code: "NO_SEED" }
      );
    }

    const url = `${this.baseUrl}${path}/${encodeURIComponent(wallet)}`;

    // Phase 1: get the 402 challenge.
    const challenge = await fetch(url);
    if (challenge.status !== 402) {
      // Unexpected — surface the body.
      const txt = await challenge.text();
      throw new NetworkError(`Expected 402 challenge, got ${challenge.status}: ${txt}`, challenge.status);
    }
    const challengeBody = await challenge.json();
    const accepts       = challengeBody.accepts?.[0];
    const x402Version   = challengeBody.x402Version || 2;
    if (!accepts) throw new XrplRiskScoreError("Malformed 402 challenge: no accepts[0]");

    // Phase 2: sign and pay.
    const xrplClient = new xrpl.Client(this.xrplServer);
    await xrplClient.connect();
    try {
      const walletObj = xrpl.Wallet.fromSeed(this.seed);
      const header    = await buildPaymentHeader({
        accepts,
        wallet:  walletObj,
        client:  xrplClient,
        x402Version,
      });

      const retry = await fetch(url, {
        headers: { "X-PAYMENT": header },
      });
      const body = await retry.json().catch(() => ({}));
      if (retry.status === 402) {
        throw new PaymentRequiredError(body.error || "Payment rejected", {
          status: 402,
          facilitatorReason: body.error,
        });
      }
      if (!retry.ok) {
        throw new NetworkError(body.error || `HTTP ${retry.status}`, retry.status);
      }
      return body;
    } finally {
      await xrplClient.disconnect();
    }
  }
}

module.exports = {
  XrplRiskScoreClient,
  XrplRiskScoreError,
  PaymentRequiredError,
  InvalidWalletError,
  NetworkError,
};

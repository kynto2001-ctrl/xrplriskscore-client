class XrplRiskScoreError extends Error {
  constructor(message, { code, status, facilitatorReason } = {}) {
    super(message);
    this.name = "XrplRiskScoreError";
    this.code = code || "UNKNOWN";
    this.status = status || null;
    this.facilitatorReason = facilitatorReason || null;
  }
}

class PaymentRequiredError extends XrplRiskScoreError {
  constructor(message, details) {
    super(message, { ...details, code: "PAYMENT_REQUIRED" });
    this.name = "PaymentRequiredError";
  }
}

class InvalidWalletError extends XrplRiskScoreError {
  constructor(wallet) {
    super(`Invalid XRPL wallet address: ${wallet}`, { code: "INVALID_WALLET" });
    this.name = "InvalidWalletError";
  }
}

class NetworkError extends XrplRiskScoreError {
  constructor(message, status) {
    super(message, { code: "NETWORK_ERROR", status });
    this.name = "NetworkError";
  }
}

module.exports = {
  XrplRiskScoreError,
  PaymentRequiredError,
  InvalidWalletError,
  NetworkError,
};

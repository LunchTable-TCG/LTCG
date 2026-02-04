/**
 * x402 Facilitator Client
 *
 * Client for interacting with x402 payment facilitators (e.g., PayAI).
 * Handles payment verification and settlement.
 *
 * @see https://facilitator.payai.network/
 * @see https://x402.org/facilitator
 */

import { X402_CONFIG, X402_ERROR_CODES } from "./constants";
import type { PaymentPayload, PaymentRequirements, SettleResponse, VerifyResponse } from "./types";

/**
 * Error thrown when facilitator operations fail
 */
export class FacilitatorError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = X402_ERROR_CODES.FACILITATOR_ERROR,
    status?: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "FacilitatorError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * x402 Facilitator Client
 *
 * Communicates with the x402 facilitator service to verify and settle payments.
 * The facilitator handles on-chain verification so servers don't need direct
 * blockchain access.
 */
export class X402FacilitatorClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(options?: { baseUrl?: string; timeout?: number; maxRetries?: number }) {
    this.baseUrl = options?.baseUrl || X402_CONFIG.FACILITATOR_URL;
    this.timeout = options?.timeout || X402_CONFIG.FACILITATOR_TIMEOUT_MS;
    this.maxRetries = options?.maxRetries || X402_CONFIG.FACILITATOR_MAX_RETRIES;
  }

  /**
   * Verify a payment with the facilitator
   *
   * Checks that the signed transaction is valid and matches the requirements.
   * Does NOT submit the transaction to the blockchain.
   *
   * @param paymentPayload - The payment payload from the client
   * @param paymentRequirements - The expected payment requirements
   * @returns Verification result
   */
  async verify(
    paymentPayload: PaymentPayload,
    paymentRequirements: PaymentRequirements
  ): Promise<VerifyResponse> {
    return this.makeRequest<VerifyResponse>("/verify", {
      paymentPayload,
      paymentRequirements,
    });
  }

  /**
   * Settle a payment with the facilitator
   *
   * Submits the signed transaction to the blockchain and waits for confirmation.
   * Only call this after verify() returns isValid: true.
   *
   * @param paymentPayload - The payment payload from the client
   * @param paymentRequirements - The expected payment requirements
   * @returns Settlement result with transaction signature
   */
  async settle(
    paymentPayload: PaymentPayload,
    paymentRequirements: PaymentRequirements
  ): Promise<SettleResponse> {
    return this.makeRequest<SettleResponse>("/settle", {
      paymentPayload,
      paymentRequirements,
    });
  }

  /**
   * Verify and settle a payment in one call
   *
   * Convenience method that verifies the payment and, if valid, settles it.
   *
   * @param paymentPayload - The payment payload from the client
   * @param paymentRequirements - The expected payment requirements
   * @returns Combined result with verification and settlement info
   */
  async verifyAndSettle(
    paymentPayload: PaymentPayload,
    paymentRequirements: PaymentRequirements
  ): Promise<{
    verified: boolean;
    settled: boolean;
    payer?: string;
    signature?: string;
    error?: string;
  }> {
    // First verify
    const verifyResult = await this.verify(paymentPayload, paymentRequirements);

    if (!verifyResult.isValid) {
      return {
        verified: false,
        settled: false,
        error: verifyResult.invalidReason || "Payment verification failed",
      };
    }

    // If already settled (transaction signature present), return early
    if (verifyResult.transactionSignature) {
      return {
        verified: true,
        settled: true,
        payer: verifyResult.payer,
        signature: verifyResult.transactionSignature,
      };
    }

    // Settle the payment
    const settleResult = await this.settle(paymentPayload, paymentRequirements);

    if (!settleResult.success) {
      return {
        verified: true,
        settled: false,
        payer: verifyResult.payer,
        error: settleResult.error || "Payment settlement failed",
      };
    }

    return {
      verified: true,
      settled: true,
      payer: verifyResult.payer,
      signature: settleResult.transactionSignature,
    };
  }

  /**
   * Make an HTTP request to the facilitator with retry logic
   */
  private async makeRequest<T>(endpoint: string, body: unknown): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Parse response
        let responseBody: unknown;
        try {
          responseBody = await response.json();
        } catch {
          const text = await response.text().catch(() => "");
          throw new FacilitatorError(
            `Invalid JSON response from facilitator: ${text.substring(0, 200)}`,
            X402_ERROR_CODES.FACILITATOR_ERROR,
            response.status
          );
        }

        // Handle error responses
        if (!response.ok) {
          const errorMessage =
            typeof responseBody === "object" && responseBody !== null && "error" in responseBody
              ? String((responseBody as { error: unknown }).error)
              : `Facilitator error: ${response.status}`;

          // Don't retry client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            throw new FacilitatorError(
              errorMessage,
              X402_ERROR_CODES.FACILITATOR_ERROR,
              response.status,
              responseBody as Record<string, unknown>
            );
          }

          // Retry server errors (5xx)
          lastError = new FacilitatorError(
            errorMessage,
            X402_ERROR_CODES.FACILITATOR_ERROR,
            response.status,
            responseBody as Record<string, unknown>
          );

          // Exponential backoff before retry
          if (attempt < this.maxRetries) {
            await this.sleep(2 ** attempt * 1000);
          }
          continue;
        }

        return responseBody as T;
      } catch (error) {
        // Handle abort (timeout)
        if (error instanceof Error && error.name === "AbortError") {
          lastError = new FacilitatorError(
            "Facilitator request timed out",
            X402_ERROR_CODES.FACILITATOR_ERROR
          );
        }
        // Handle network errors
        else if (error instanceof TypeError && error.message.includes("fetch")) {
          lastError = new FacilitatorError(
            `Network error connecting to facilitator: ${error.message}`,
            X402_ERROR_CODES.FACILITATOR_ERROR
          );
        }
        // Re-throw FacilitatorErrors (don't wrap)
        else if (error instanceof FacilitatorError) {
          throw error;
        }
        // Wrap other errors
        else {
          lastError = new FacilitatorError(
            error instanceof Error ? error.message : String(error),
            X402_ERROR_CODES.FACILITATOR_ERROR
          );
        }

        // Exponential backoff before retry
        if (attempt < this.maxRetries) {
          await this.sleep(2 ** attempt * 1000);
        }
      }
    }

    throw lastError || new FacilitatorError("Unknown facilitator error");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Default facilitator client instance
 * Uses configuration from X402_CONFIG
 */
export const defaultFacilitator = new X402FacilitatorClient();

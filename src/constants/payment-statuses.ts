/**
 * Payment status constants
 * Defines all possible payment statuses and their meanings
 */

/**
 * All payment statuses in the system
 */
export const PaymentStatus = {
  // Card payments (Tap Payments)
  CAPTURED: 'CAPTURED',  // Card payment successfully captured
  PAID: 'PAID',          // Generic successful payment
  
  // Wallet payments
  DEBIT: 'DEBIT',        // Wallet purchase - money deducted from wallet
  CREDIT: 'CREDIT',      // Wallet top-up - money added to wallet
  
  // Other statuses
  PENDING: 'PENDING',    // Payment initiated but not completed
  FAILED: 'FAILED',      // Payment failed
  REFUNDED: 'REFUNDED'   // Payment was refunded
} as const;

/**
 * Payment statuses that allow product dispensing
 * These represent completed payments where products should be dispensed
 */
export const DISPENSABLE_PAYMENT_STATUSES = [
  PaymentStatus.PAID,      // Card payment via Tap
  PaymentStatus.CAPTURED,  // Card payment via Tap (captured)
  PaymentStatus.DEBIT      // Wallet payment (money deducted)
  // Note: CREDIT is NOT included - wallet top-ups should not trigger dispense
] as const;

/**
 * Check if a payment status allows dispensing
 */
export const isDispensableStatus = (status: string): boolean => {
  return DISPENSABLE_PAYMENT_STATUSES.includes(status as any);
};

/**
 * Payment statuses that represent successful transactions
 */
export const SUCCESSFUL_PAYMENT_STATUSES = [
  PaymentStatus.PAID,
  PaymentStatus.CAPTURED,
  PaymentStatus.DEBIT
] as const;

/**
 * Transaction Status Validation Helper
 * Validates status transitions and ensures all prerequisites are met
 */

import { TransactionStatus } from '@/types/shared';

interface Transaction {
  id: string;
  status: TransactionStatus;
  qr1_generated_at: Date | null;
  qr2_generated_at: Date | null;
  otp_sent_at: Date | null;
  otp_verified_at: Date | null;
  completed_at: Date | null;
}

/**
 * Valid status transition map
 * Each status can only transition to specific next statuses
 */
const VALID_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  [TransactionStatus.INITIATED]: [TransactionStatus.QR1_SCANNED, TransactionStatus.CANCELLED],
  [TransactionStatus.QR1_SCANNED]: [TransactionStatus.QR2_GENERATED, TransactionStatus.CANCELLED],
  [TransactionStatus.QR2_GENERATED]: [TransactionStatus.QR2_SCANNED, TransactionStatus.CANCELLED],
  [TransactionStatus.QR2_SCANNED]: [TransactionStatus.OTP_SENT, TransactionStatus.CANCELLED],
  [TransactionStatus.OTP_SENT]: [TransactionStatus.OTP_VERIFIED, TransactionStatus.FAILED, TransactionStatus.CANCELLED],
  [TransactionStatus.OTP_VERIFIED]: [TransactionStatus.COMPLETED, TransactionStatus.FAILED, TransactionStatus.CANCELLED],
  [TransactionStatus.COMPLETED]: [], // Terminal state
  [TransactionStatus.FAILED]: [], // Terminal state
  [TransactionStatus.CANCELLED]: [], // Terminal state
};

/**
 * Validates if a status transition is allowed
 */
export function isValidTransition(
  currentStatus: TransactionStatus,
  nextStatus: TransactionStatus
): boolean {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
  return allowedTransitions.includes(nextStatus);
}

/**
 * Validates prerequisites for a given status
 */
export function validateStatusPrerequisites(
  transaction: Transaction,
  targetStatus: TransactionStatus
): { valid: boolean; error?: string } {
  switch (targetStatus) {
    case TransactionStatus.QR2_GENERATED:
      if (!transaction.qr1_generated_at) {
        return {
          valid: false,
          error: 'QR1 must be generated before QR2',
        };
      }
      break;

    case TransactionStatus.OTP_SENT:
      if (!transaction.qr2_generated_at) {
        return {
          valid: false,
          error: 'QR2 must be generated before sending OTP',
        };
      }
      break;

    case TransactionStatus.OTP_VERIFIED:
      if (!transaction.qr1_generated_at) {
        return {
          valid: false,
          error: 'QR1 must be scanned before verifying OTP',
        };
      }
      if (!transaction.qr2_generated_at) {
        return {
          valid: false,
          error: 'QR2 must be scanned before verifying OTP',
        };
      }
      if (!transaction.otp_sent_at) {
        return {
          valid: false,
          error: 'OTP must be sent before verification',
        };
      }
      break;

    case TransactionStatus.COMPLETED:
      if (!transaction.otp_verified_at) {
        return {
          valid: false,
          error: 'OTP must be verified before completion',
        };
      }
      if (!transaction.qr1_generated_at) {
        return {
          valid: false,
          error: 'QR1 must be scanned',
        };
      }
      if (!transaction.qr2_generated_at) {
        return {
          valid: false,
          error: 'QR2 must be generated and scanned',
        };
      }
      break;
  }

  return { valid: true };
}

/**
 * Validates a complete status transition
 * Checks both transition validity and prerequisites
 */
export function validateStatusTransition(
  transaction: Transaction,
  targetStatus: TransactionStatus
): { valid: boolean; error?: string } {
  // Check if transition is valid
  if (!isValidTransition(transaction.status, targetStatus)) {
    return {
      valid: false,
      error: `Invalid status transition from ${transaction.status} to ${targetStatus}`,
    };
  }

  // Check prerequisites
  return validateStatusPrerequisites(transaction, targetStatus);
}

/**
 * Gets the next expected status in the transaction flow
 */
export function getNextExpectedStatus(
  currentStatus: TransactionStatus
): TransactionStatus | null {
  const transitions = VALID_TRANSITIONS[currentStatus];
  if (!transitions || transitions.length === 0) {
    return null;
  }
  
  // Return the primary (first) transition, ignoring CANCELLED/FAILED
  return transitions.find(
    (status) => status !== TransactionStatus.CANCELLED && status !== TransactionStatus.FAILED
  ) || null;
}

/**
 * Checks if a status is terminal (no further transitions allowed)
 */
export function isTerminalStatus(status: TransactionStatus): boolean {
  return (
    status === TransactionStatus.COMPLETED ||
    status === TransactionStatus.FAILED ||
    status === TransactionStatus.CANCELLED
  );
}

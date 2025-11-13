import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken, getUserByFirebaseUid } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { OTPService } from '@/lib/otp';

const verifyOTPSchema = z.object({
  transactionId: z.string().uuid(),
  otp: z.string().length(6),
});

// POST /api/transactions/verify-otp
export async function POST(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const user = await ClerkService.getCurrentUser();
    if (!user) {
      return apiError('Unauthorized', 401, request);
    }

    const body = await request.json();
    const { transactionId, otp } = verifyOTPSchema.parse(body);

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        receiver: true,
        company: true,
      },
    });

    if (!transaction) {
      return apiError('Transaction not found', 404, request);
    }

    // Verify user is the sender
    if (transaction.senderId !== user.id) {
      return apiError('Unauthorized', 403, request);
    }

    // Verify status
    if (transaction.status !== 'OTP_SENT') {
      return apiError('Invalid transaction status', 400, request);
    }

    // Check OTP attempts
    if (transaction.otpAttempts >= 3) {
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'FAILED' },
      });
      return apiError('Maximum OTP attempts exceeded', 400, request);
    }

    if (!user.phone) {
      return apiError('Phone number not found', 400, request);
    }

    try {
      // Verify OTP
      await OTPService.verifyOTP(user.phone, otp, 'transaction', transactionId);

      // Update transaction to completed
      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'COMPLETED',
          otpVerifiedAt: new Date(),
          completedAt: new Date(),
        },
      });

      // Log the action
      await prisma.transactionLog.create({
        data: {
          transactionId: transaction.id,
          action: 'TRANSACTION_COMPLETED',
          status: 'COMPLETED',
          metadata: { verifiedBy: user.id },
        },
      });

      // Notify both parties
      await prisma.notification.createMany({
        data: [
          {
            userId: transaction.senderId,
            companyId: transaction.companyId,
            title: 'Transaction Completed',
            message: `Transaction ${transaction.transactionNumber} completed successfully`,
            type: 'TRANSACTION',
            priority: 'HIGH',
            actionUrl: `/transactions/${transaction.id}`,
          },
          {
            userId: transaction.receiverId,
            companyId: transaction.companyId,
            title: 'Payment Received',
            message: `Payment of ${transaction.currency} ${transaction.amount} received`,
            type: 'TRANSACTION',
            priority: 'HIGH',
            actionUrl: `/transactions/${transaction.id}`,
          },
        ],
      });

      return apiResponse(
        {
          transaction: {
            id: transaction.id,
            transactionNumber: transaction.transactionNumber,
            amount: transaction.amount,
            currency: transaction.currency,
            status: 'COMPLETED',
            completedAt: new Date().toISOString(),
          },
          message: 'Transaction completed successfully!',
        },
        200,
        request
      );
    } catch (otpError: any) {
      // Increment OTP attempts
      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          otpAttempts: { increment: 1 },
        },
      });

      return apiError(otpError.message || 'Invalid OTP', 400, request);
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return apiError('Validation error', 400, request, error.errors);
    }
    console.error('Verify OTP error:', error);
    return apiError(error.message || 'Failed to verify OTP', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request); return corsResponse || new NextResponse(null, { status: 204 });
}

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
    // Get Firebase token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiError('Unauthorized - No token provided', 401, request);
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    const user = await getUserByFirebaseUid(decodedToken.uid);

    if (!user) {
      return apiError('User not found', 404, request);
    }

    const body = await request.json();
    const { transactionId, otp } = verifyOTPSchema.parse(body);

    const transaction = await prisma.transactions.findUnique({
      where: { id: transactionId },
      include: {
        users_transactions_receiver_idTousers: true,
        companies: true,
      },
    });

    if (!transaction) {
      return apiError('Transaction not found', 404, request);
    }

    // Verify user is the sender
    if (transaction.sender_id !== user.id) {
      return apiError('Unauthorized', 403, request);
    }

    // Verify status
    if (transaction.status !== 'OTP_SENT') {
      return apiError('Invalid transaction status', 400, request);
    }

    // VALIDATION: Ensure both QR codes were scanned before verifying OTP
    if (!transaction.qr1_generated_at) {
      return apiError('QR1 must be scanned before verifying OTP', 400, request);
    }

    if (!transaction.qr2_generated_at) {
      return apiError('QR2 must be scanned before verifying OTP', 400, request);
    }

    // Check OTP attempts
    if (transaction.otp_attempts >= 3) {
      await prisma.transactions.update({
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

      // Update transaction to OTP_VERIFIED (not COMPLETED yet)
      await prisma.transactions.update({
        where: { id: transactionId },
        data: {
          status: 'OTP_VERIFIED',
          otp_verified_at: new Date(),
        },
      });

      // Log the action
      await prisma.transaction_logs.create({
        data: {
          transaction_id: transaction.id,
          action: 'OTP_VERIFIED',
          status: 'OTP_VERIFIED',
          metadata: { verifiedBy: user.id },
        },
      });

      // Notify sender that OTP is verified and payment needs to be completed
      await prisma.notifications.create({
        data: {
          user_id: transaction.sender_id,
          company_id: transaction.company_id,
          title: 'OTP Verified',
          message: `OTP verified for transaction ${transaction.transaction_number}. Complete payment to finish.`,
          type: 'TRANSACTION',
          priority: 'HIGH',
          action_url: `/transactions/${transaction.id}`,
        },
      });

      return apiResponse(
        {
          transaction: {
            id: transaction.id,
            transactionNumber: transaction.transaction_number,
            amount: transaction.amount,
            currency: transaction.currency,
            status: 'OTP_VERIFIED',
            otpVerifiedAt: new Date().toISOString(),
          },
          message: 'OTP verified successfully! Complete payment to finish transaction.',
        },
        200,
        request
      );
    } catch (otpError: any) {
      // Increment OTP attempts
      await prisma.transactions.update({
        where: { id: transactionId },
        data: {
          otp_attempts: { increment: 1 },
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

import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { ClerkService } from '@/lib/clerk';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { OTPService } from '@/lib/otp';

const sendOTPSchema = z.object({
  transactionId: z.string().uuid(),
});

// POST /api/transactions/send-otp
export async function POST(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const user = await ClerkService.getCurrentUser();
    if (!user) {
      return apiError('Unauthorized', 401, request);
    }

    const body = await request.json();
    const { transactionId } = sendOTPSchema.parse(body);

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return apiError('Transaction not found', 404, request);
    }

    // Verify user is the sender
    if (transaction.senderId !== user.id) {
      return apiError('Unauthorized', 403, request);
    }

    // Verify status
    if (transaction.status !== 'QR2_SCANNED') {
      return apiError('Invalid transaction status', 400, request);
    }

    if (!user.phone) {
      return apiError('Phone number not found', 400, request);
    }

    // Send OTP
    const { expiresAt } = await OTPService.sendOTP(
      user.phone,
      'transaction',
      transactionId
    );

    // Update transaction
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'OTP_SENT',
        otpSentAt: new Date(),
      },
    });

    // Log the action
    await prisma.transactionLog.create({
      data: {
        transactionId: transaction.id,
        action: 'OTP_SENT',
        status: 'OTP_SENT',
        metadata: { sentTo: user.phone },
      },
    });

    return apiResponse(
      {
        message: 'OTP sent successfully',
        expiresAt: expiresAt.toISOString(),
        expiresIn: 300, // 5 minutes in seconds
      },
      200,
      request
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return apiError('Validation error', 400, request, error.errors);
    }
    console.error('Send OTP error:', error);
    return apiError(error.message || 'Failed to send OTP', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request);
}

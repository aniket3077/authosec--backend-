import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken, getUserByFirebaseUid } from '@/lib/firebase-auth';
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
    const { transactionId } = sendOTPSchema.parse(body);

    const transaction = await prisma.transactions.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return apiError('Transaction not found', 404, request);
    }

    // Verify user is the sender
    if (transaction.sender_id !== user.id) {
      return apiError('Unauthorized', 403, request);
    }

    // Verify status
    if (transaction.status !== 'QR2_SCANNED') {
      return apiError('Invalid transaction status', 400, request);
    }

    // VALIDATION: Ensure QR2 was generated and scanned before sending OTP
    if (!transaction.qr2_generated_at) {
      return apiError('QR2 must be generated before sending OTP', 400, request);
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
    await prisma.transactions.update({
      where: { id: transactionId },
      data: {
        status: 'OTP_SENT',
        otp_sent_at: new Date(),
      },
    });

    // Log the action
    await prisma.transaction_logs.create({
      data: {
        transaction_id: transaction.id,
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
  const corsResponse = handleCors(request); return corsResponse || new NextResponse(null, { status: 204 });
}

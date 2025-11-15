import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken, getUserByFirebaseUid } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

// POST /api/transactions/[id]/complete
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    const transaction = await prisma.transactions.findUnique({
      where: { id },
      include: {
        users_transactions_receiver_idTousers: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!transaction) {
      return apiError('Transaction not found', 404, request);
    }

    // Verify user is the sender
    if (transaction.sender_id !== user.id) {
      return apiError('Unauthorized - Only sender can complete payment', 403, request);
    }

    // Verify transaction status is OTP_VERIFIED
    if (transaction.status !== 'OTP_VERIFIED') {
      return apiError(
        `Cannot complete payment. Transaction must be in OTP_VERIFIED status. Current status: ${transaction.status}`,
        400,
        request
      );
    }

    // Verify both QR codes were scanned
    if (!transaction.qr1_generated_at) {
      return apiError('QR1 was not generated', 400, request);
    }

    if (!transaction.qr2_generated_at) {
      return apiError('QR2 was not generated', 400, request);
    }

    // Verify OTP was verified
    if (!transaction.otp_verified_at) {
      return apiError('OTP was not verified', 400, request);
    }

    // Update transaction to COMPLETED
    await prisma.transactions.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completed_at: new Date(),
      },
    });

    // Create transaction log
    await prisma.transaction_logs.create({
      data: {
        id: uuidv4(),
        transaction_id: id,
        action: 'TRANSACTION_COMPLETED',
        status: 'COMPLETED',
        metadata: { completedBy: user.id },
      },
    });

    // Send completion notifications to both parties
    await prisma.notifications.createMany({
      data: [
        {
          id: uuidv4(),
          user_id: transaction.sender_id,
          company_id: transaction.company_id,
          title: 'Transaction Completed',
          message: `Transaction ${transaction.transaction_number} completed successfully`,
          type: 'TRANSACTION',
          priority: 'HIGH',
          action_url: `/transactions/${transaction.id}`,
        },
        {
          id: uuidv4(),
          user_id: transaction.receiver_id,
          company_id: transaction.company_id,
          title: 'Payment Received',
          message: `Payment of ${transaction.currency} ${transaction.amount} received`,
          type: 'TRANSACTION',
          priority: 'HIGH',
          action_url: `/transactions/${transaction.id}`,
        },
      ],
    });

    return apiResponse(
      {
        transaction: {
          id: transaction.id,
          transactionNumber: transaction.transaction_number,
          amount: transaction.amount,
          currency: transaction.currency,
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
        },
        message: 'Payment completed successfully!',
      },
      200,
      request
    );
  } catch (error: any) {
    console.error('Complete payment error:', error);
    return apiError(error.message || 'Failed to complete payment', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request);
  return corsResponse || new NextResponse(null, { status: 204 });
}

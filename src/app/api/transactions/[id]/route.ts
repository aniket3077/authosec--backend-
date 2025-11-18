import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken, getUserByFirebaseUid } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';

// GET /api/transactions/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    const transaction = await prisma.transactions.findUnique({
      where: { id },
      include: {
        users_transactions_sender_idTousers: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
          },
        },
        users_transactions_receiver_idTousers: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
          },
        },
        companies: true,
        transaction_logs: {
          orderBy: { created_at: 'desc' },
          take: 10,
        },
      },
    });

    if (!transaction) {
      return apiError('Transaction not found', 404, request);
    }

    // Verify user has access
    if (
      transaction.sender_id !== user.id &&
      transaction.receiver_id !== user.id
    ) {
      return apiError('Unauthorized', 403, request);
    }

    return apiResponse({ transaction }, 200, request);
  } catch (error: any) {
    console.error('Get transaction error:', error);
    return apiError(error.message || 'Failed to fetch transaction', 500, request);
  }
}

// PATCH /api/transactions/[id] - Cancel transaction
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    const transaction = await prisma.transactions.findUnique({
      where: { id },
    });

    if (!transaction) {
      return apiError('Transaction not found', 404, request);
    }

    // Only sender can cancel
    if (transaction.sender_id !== user.id) {
      return apiError('Unauthorized', 403, request);
    }

    if (action === 'cancel') {
      // Can only cancel if not completed
      if (transaction.status === 'COMPLETED') {
        return apiError('Cannot cancel completed transaction', 400, request);
      }

      await prisma.transactions.update({
        where: { id },
        data: {
          status: 'CANCELLED',
        },
      });

      // Log the action
      await prisma.transaction_logs.create({
        data: {
          transaction_id: id,
          action: 'CANCELLED',
          status: 'CANCELLED',
          metadata: { cancelledBy: user.id },
        },
      });

      // Notify receiver if applicable
      if (transaction.receiver_id) {
        await prisma.notifications.create({
          data: {
            user_id: transaction.receiver_id,
            company_id: transaction.company_id,
            title: 'Transaction Cancelled',
            message: `Transaction ${transaction.transaction_number} has been cancelled`,
            type: 'TRANSACTION',
            priority: 'NORMAL',
          },
        });
      }

      return apiResponse(
        { message: 'Transaction cancelled successfully' },
        200,
        request
      );
    }

    return apiError('Invalid action', 400, request);
  } catch (error: any) {
    console.error('Update transaction error:', error);
    return apiError(error.message || 'Failed to update transaction', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request);
}

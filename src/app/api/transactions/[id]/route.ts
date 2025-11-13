import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken, getUserByFirebaseUid } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';

// GET /api/transactions/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const user = await ClerkService.getCurrentUser();
    if (!user) {
      return apiError('Unauthorized', 401, request);
    }

    const { id } = params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            imageUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            imageUrl: true,
          },
        },
        company: true,
        logs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!transaction) {
      return apiError('Transaction not found', 404, request);
    }

    // Verify user has access
    if (
      transaction.senderId !== user.id &&
      transaction.receiverId !== user.id &&
      !await ClerkService.isSuperAdmin()
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
  { params }: { params: { id: string } }
) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const user = await ClerkService.getCurrentUser();
    if (!user) {
      return apiError('Unauthorized', 401, request);
    }

    const { id } = params;
    const body = await request.json();
    const { action } = body;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return apiError('Transaction not found', 404, request);
    }

    // Only sender can cancel
    if (transaction.senderId !== user.id) {
      return apiError('Unauthorized', 403, request);
    }

    if (action === 'cancel') {
      // Can only cancel if not completed
      if (transaction.status === 'COMPLETED') {
        return apiError('Cannot cancel completed transaction', 400, request);
      }

      await prisma.transaction.update({
        where: { id },
        data: {
          status: 'CANCELLED',
        },
      });

      // Log the action
      await prisma.transactionLog.create({
        data: {
          transactionId: id,
          action: 'CANCELLED',
          status: 'CANCELLED',
          metadata: { cancelledBy: user.id },
        },
      });

      // Notify receiver if applicable
      if (transaction.receiverId) {
        await prisma.notification.create({
          data: {
            userId: transaction.receiverId,
            companyId: transaction.companyId,
            title: 'Transaction Cancelled',
            message: `Transaction ${transaction.transactionNumber} has been cancelled`,
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

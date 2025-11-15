import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken, getUserByFirebaseUid } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';

// GET /api/transactions
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      OR: [
        { sender_id: user.id },
        { receiver_id: user.id },
      ],
    };

    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await prisma.transactions.count({ where });

    // Get transactions
    const transactions = await prisma.transactions.findMany({
      where,
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
            companies: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
    });

    // Transform to expected format
    const transformedTransactions = transactions.map(t => ({
      id: t.id,
      transactionNumber: t.transaction_number,
      senderId: t.sender_id,
      receiverId: t.receiver_id,
      amount: t.amount ? parseFloat(t.amount.toString()) : null,
      currency: t.currency,
      description: t.description,
      status: t.status,
      createdAt: t.created_at,
      completedAt: t.completed_at,
      sender: {
        id: t.users_transactions_sender_idTousers.id,
        firstName: t.users_transactions_sender_idTousers.first_name,
        lastName: t.users_transactions_sender_idTousers.last_name,
        email: t.users_transactions_sender_idTousers.email,
        phone: t.users_transactions_sender_idTousers.phone,
      },
      receiver: {
        id: t.users_transactions_receiver_idTousers.id,
        firstName: t.users_transactions_receiver_idTousers.first_name,
        lastName: t.users_transactions_receiver_idTousers.last_name,
        email: t.users_transactions_receiver_idTousers.email,
        phone: t.users_transactions_receiver_idTousers.phone,
        company: t.users_transactions_receiver_idTousers.companies ? {
          id: t.users_transactions_receiver_idTousers.companies.id,
          name: t.users_transactions_receiver_idTousers.companies.name,
        } : null,
      },
    }));

    return apiResponse(
      transformedTransactions,
      200,
      request
    );
  } catch (error: any) {
    console.error('Get transactions error:', error);
    return apiError(error.message || 'Failed to fetch transactions', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request); return corsResponse || new NextResponse(null, { status: 204 });
}

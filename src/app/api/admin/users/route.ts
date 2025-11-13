import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken, getUserByFirebaseUid, isSuperAdmin } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/users
export async function GET(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const user = await ClerkService.getCurrentUser();
    if (!user) {
      return apiError('Unauthorized', 401, request);
    }

    // Only super admin can access
    if (!await ClerkService.isSuperAdmin()) {
      return apiError('Insufficient permissions', 403, request);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const role = searchParams.get('role');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              sentTransactions: true,
              receivedTransactions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return apiResponse(
      {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      200,
      request
    );
  } catch (error: any) {
    console.error('Get users error:', error);
    return apiError(error.message || 'Failed to fetch users', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request); return corsResponse || new NextResponse(null, { status: 204 });
}

import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken, getUserByFirebaseUid, isSuperAdmin } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/audit-logs
export async function GET(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    // Verify Firebase token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError('Unauthorized', 401, request);
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);
    const user = await getUserByFirebaseUid(decodedToken.uid);

    if (!user) {
      return apiError('User not found', 404, request);
    }

    // Only super admin can access audit logs
    if (!await isSuperAdmin(decodedToken.uid)) {
      return apiError('Insufficient permissions', 403, request);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resourceType');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return apiResponse(
      {
        logs,
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
    console.error('Get audit logs error:', error);
    return apiError(error.message || 'Failed to fetch audit logs', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request);
  return corsResponse || new NextResponse(null, { status: 204 });
}

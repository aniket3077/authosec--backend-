import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { ClerkService } from '@/lib/clerk';
import { prisma } from '@/lib/prisma';

// GET /api/admin/audit-logs
export async function GET(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const user = await ClerkService.getCurrentUser();
    if (!user) {
      return apiError('Unauthorized', 401, request);
    }

    // Only super admin can access audit logs
    if (!await ClerkService.isSuperAdmin()) {
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
  return handleCors(request);
}

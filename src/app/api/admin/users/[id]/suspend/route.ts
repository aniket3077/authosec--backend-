import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken, getUserByFirebaseUid, isSuperAdmin } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';

// POST /api/admin/users/[id]/suspend
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const user = await ClerkService.getCurrentUser();
    if (!user) {
      return apiError('Unauthorized', 401, request);
    }

    // Only super admin can suspend users
    if (!await ClerkService.isSuperAdmin()) {
      return apiError('Insufficient permissions', 403, request);
    }

    const { id } = await params;

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return apiError('User not found', 404, request);
    }

    // Cannot suspend yourself
    if (id === user.id) {
      return apiError('Cannot suspend yourself', 400, request);
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'SUSPEND_USER',
        resource: 'USER',
        resourceId: id,
        oldValues: { isActive: true },
        newValues: { isActive: false },
      },
    });

    // Notify the user
    await prisma.notification.create({
      data: {
        userId: id,
        title: 'Account Suspended',
        message: 'Your account has been suspended. Please contact support.',
        type: 'SECURITY',
        priority: 'URGENT',
      },
    });

    return apiResponse(
      { message: 'User suspended successfully' },
      200,
      request
    );
  } catch (error: any) {
    console.error('Suspend user error:', error);
    return apiError(error.message || 'Failed to suspend user', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request);
}

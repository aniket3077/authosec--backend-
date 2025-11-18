import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/firebase-admin';

/**
 * PATCH /api/company/users/[id]/status
 * Activate or suspend a user
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiError('Unauthorized - No token provided', 401, request);
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);

    const adminUser = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!adminUser || adminUser.role !== 'COMPANY_ADMIN' || !adminUser.companyId) {
      return apiError('Forbidden', 403, request);
    }

    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return apiError('isActive must be a boolean', 400, request);
    }

    const { id } = await params;

    // Get the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!targetUser) {
      return apiError('User not found', 404, request);
    }

    // Verify user belongs to same company
    if (targetUser.companyId !== adminUser.companyId) {
      return apiError('Forbidden - User does not belong to your company', 403, request);
    }

    // Prevent admin from deactivating themselves
    if (targetUser.id === adminUser.id) {
      return apiError('Cannot change your own status', 400, request);
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    // Disable Firebase account if suspending
    if (!isActive && targetUser.firebaseUid) {
      try {
        await auth.updateUser(targetUser.firebaseUid, {
          disabled: true,
        });
      } catch (error) {
        console.error('Failed to disable Firebase user:', error);
      }
    } else if (isActive && targetUser.firebaseUid) {
      try {
        await auth.updateUser(targetUser.firebaseUid, {
          disabled: false,
        });
      } catch (error) {
        console.error('Failed to enable Firebase user:', error);
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        companyId: adminUser.companyId,
        action: isActive ? 'ACTIVATE_USER' : 'SUSPEND_USER',
        resource: 'User',
        resourceId: targetUser.id,
        oldValues: { isActive: targetUser.isActive },
        newValues: { isActive },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // Send notification to user
    await prisma.notification.create({
      data: {
        userId: targetUser.id,
        companyId: adminUser.companyId,
        title: isActive ? 'Account Activated' : 'Account Suspended',
        message: isActive
          ? 'Your account has been activated. You can now access the system.'
          : 'Your account has been suspended. Please contact your administrator.',
        type: 'SECURITY',
        priority: 'HIGH',
      },
    });

    return apiResponse(
      { user: updatedUser },
      200,
      request
    );
  } catch (error: any) {
    console.error('Update user status error:', error);
    return apiError(
      error.message || 'Failed to update user status',
      500,
      request
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request) || new Response(null, { status: 200 });
}

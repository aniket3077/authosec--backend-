import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const settingsSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  address: z.string().optional(),
  businessType: z.string().optional(),
  settings: z.record(z.any()).optional(),
});

/**
 * GET /api/company/settings
 * Get company settings
 */
export async function GET(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiError('Unauthorized - No token provided', 401, request);
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      include: { company: true },
    });

    if (!user || user.role !== 'COMPANY_ADMIN' || !user.companyId) {
      return apiError('Forbidden', 403, request);
    }

    return apiResponse(
      { company: user.company },
      200,
      request
    );
  } catch (error: any) {
    console.error('Get settings error:', error);
    return apiError(
      error.message || 'Failed to fetch settings',
      500,
      request
    );
  }
}

/**
 * PATCH /api/company/settings
 * Update company settings
 */
export async function PATCH(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiError('Unauthorized - No token provided', 401, request);
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!user || user.role !== 'COMPANY_ADMIN' || !user.companyId) {
      return apiError('Forbidden', 403, request);
    }

    const body = await request.json();
    const validation = settingsSchema.safeParse(body);

    if (!validation.success) {
      return apiError(
        'Validation failed',
        400,
        request,
        validation.error.errors
      );
    }

    const currentCompany = await prisma.company.findUnique({
      where: { id: user.companyId },
    });

    const updatedCompany = await prisma.company.update({
      where: { id: user.companyId },
      data: validation.data,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        companyId: user.companyId,
        action: 'UPDATE_COMPANY_SETTINGS',
        resource: 'Company',
        resourceId: user.companyId,
        oldValues: currentCompany,
        newValues: validation.data,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return apiResponse(
      { company: updatedCompany },
      200,
      request
    );
  } catch (error: any) {
    console.error('Update settings error:', error);
    return apiError(
      error.message || 'Failed to update settings',
      500,
      request
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request) || new Response(null, { status: 200 });
}

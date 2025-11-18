import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken, getUserByFirebaseUid, isSuperAdmin } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateCompanySchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  businessType: z.string().optional(),
  address: z.string().optional(),
  subscriptionTier: z.enum(['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE']).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/companies/[id]
export async function GET(
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

    const { id } = await params;

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            transactions: true,
            notifications: true,
          },
        },
      },
    });

    if (!company) {
      return apiError('Company not found', 404, request);
    }

    // Verify access
    const isSuperAdmin = await ClerkService.isSuperAdmin();
    if (!isSuperAdmin && user.companyId !== id) {
      return apiError('Unauthorized', 403, request);
    }

    return apiResponse({ company }, 200, request);
  } catch (error: any) {
    console.error('Get company error:', error);
    return apiError(error.message || 'Failed to fetch company', 500, request);
  }
}

// PUT /api/companies/[id]
export async function PUT(
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

    const { id } = await params;

    // Verify access
    const isSuperAdmin = await ClerkService.isSuperAdmin();
    const isCompanyAdmin = await ClerkService.isCompanyAdmin();
    
    if (!isSuperAdmin && (!isCompanyAdmin || user.companyId !== id)) {
      return apiError('Insufficient permissions', 403, request);
    }

    const body = await request.json();
    const validatedData = updateCompanySchema.parse(body);

    const oldCompany = await prisma.company.findUnique({
      where: { id },
    });

    if (!oldCompany) {
      return apiError('Company not found', 404, request);
    }

    const company = await prisma.company.update({
      where: { id },
      data: validatedData,
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE_COMPANY',
        resource: 'COMPANY',
        resourceId: id,
        oldValues: oldCompany,
        newValues: validatedData,
      },
    });

    return apiResponse(
      {
        company,
        message: 'Company updated successfully',
      },
      200,
      request
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return apiError('Validation error', 400, request, error.errors);
    }
    console.error('Update company error:', error);
    return apiError(error.message || 'Failed to update company', 500, request);
  }
}

// DELETE /api/companies/[id]
export async function DELETE(
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

    // Only super admin can delete companies
    if (!await ClerkService.isSuperAdmin()) {
      return apiError('Insufficient permissions', 403, request);
    }

    const { id } = await params;

    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      return apiError('Company not found', 404, request);
    }

    await prisma.company.delete({
      where: { id },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE_COMPANY',
        resource: 'COMPANY',
        resourceId: id,
        oldValues: company,
      },
    });

    return apiResponse(
      { message: 'Company deleted successfully' },
      200,
      request
    );
  } catch (error: any) {
    console.error('Delete company error:', error);
    return apiError(error.message || 'Failed to delete company', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request);
}

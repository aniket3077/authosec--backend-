import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken, getUserByFirebaseUid, isCompanyAdmin } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createCompanySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string(),
  businessType: z.string(),
  registrationId: z.string(),
  address: z.string().optional(),
  subscriptionTier: z.enum(['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE']).optional(),
});

// GET /api/companies - List all companies
export async function GET(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const user = await ClerkService.getCurrentUser();
    if (!user) {
      return apiError('Unauthorized', 401, request);
    }

    const isSuperAdmin = await ClerkService.isSuperAdmin();

    // Super admin sees all, others see only their company
    const where = isSuperAdmin ? {} : { id: user.companyId || '' };

    const companies = await prisma.company.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            transactions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiResponse({ companies }, 200, request);
  } catch (error: any) {
    console.error('Get companies error:', error);
    return apiError(error.message || 'Failed to fetch companies', 500, request);
  }
}

// POST /api/companies - Create new company
export async function POST(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const user = await ClerkService.getCurrentUser();
    if (!user) {
      return apiError('Unauthorized', 401, request);
    }

    // Only super admin can create companies
    if (!await ClerkService.isSuperAdmin()) {
      return apiError('Insufficient permissions', 403, request);
    }

    const body = await request.json();
    const validatedData = createCompanySchema.parse(body);

    const company = await prisma.company.create({
      data: {
        ...validatedData,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE_COMPANY',
        resource: 'COMPANY',
        resourceId: company.id,
        newValues: validatedData,
      },
    });

    return apiResponse(
      {
        company,
        message: 'Company created successfully',
      },
      201,
      request
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return apiError('Validation error', 400, request, error.errors);
    }
    console.error('Create company error:', error);
    return apiError(error.message || 'Failed to create company', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request); return corsResponse || new NextResponse(null, { status: 204 });
}

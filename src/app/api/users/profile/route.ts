import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { ClerkService } from '@/lib/clerk';
import { prisma } from '@/lib/prisma';

// GET /api/users/profile
export async function GET(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const user = await ClerkService.getCurrentUser();
    if (!user) {
      return apiError('Unauthorized', 401, request);
    }

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        company: true,
        _count: {
          select: {
            sentTransactions: true,
            receivedTransactions: true,
            notifications: true,
          },
        },
      },
    });

    return apiResponse({ profile }, 200, request);
  } catch (error: any) {
    console.error('Get profile error:', error);
    return apiError(error.message || 'Failed to fetch profile', 500, request);
  }
}

// PUT /api/users/profile
export async function PUT(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const user = await ClerkService.getCurrentUser();
    if (!user) {
      return apiError('Unauthorized', 401, request);
    }

    const body = await request.json();
    const { firstName, lastName, phone } = body;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName,
        lastName,
        phone,
      },
    });

    return apiResponse(
      {
        user: updatedUser,
        message: 'Profile updated successfully',
      },
      200,
      request
    );
  } catch (error: any) {
    console.error('Update profile error:', error);
    return apiError(error.message || 'Failed to update profile', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request);
}

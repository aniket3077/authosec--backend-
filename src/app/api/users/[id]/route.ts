import { NextRequest } from 'next/server';
import { handleCors } from '@/lib/cors';
import { apiResponse, apiError } from '@/lib/response';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
});

// GET /api/users/[id] - Get user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const { id } = await params;
    
    const user = await prisma.users.findUnique({
      where: { id },
      include: {
        companies: true,
        notifications: {
          orderBy: { created_at: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            transactions_transactions_sender_idTousers: true,
            transactions_transactions_receiver_idTousers: true,
            notifications: true,
          },
        },
      },
    });

    if (!user) {
      return apiError('User not found', 404, request);
    }

    return apiResponse(user, 200, request);
  } catch (error) {
    console.error('Error fetching user:', error);
    return apiError('Failed to fetch user', 500, request);
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const { id } = await params;
    const body = await request.json();
    
    const validatedData = updateUserSchema.parse(body);

    const user = await prisma.users.update({
      where: { id },
      data: {
        ...validatedData,
        updated_at: new Date(),
      },
    });

    return apiResponse(user, 200, request);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError('Validation error', 400, request, error.errors);
    }
    console.error('Error updating user:', error);
    return apiError('Failed to update user', 500, request);
  }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const { id } = await params;
    
    await prisma.users.delete({
      where: { id },
    });

    return apiResponse({ message: 'User deleted successfully' }, 200, request);
  } catch (error) {
    console.error('Error deleting user:', error);
    return apiError('Failed to delete user', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request);
}

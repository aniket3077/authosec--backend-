import { NextRequest } from 'next/server';
import { handleCors } from '@/lib/cors';
import { apiResponse, apiError } from '@/lib/response';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Validation schema
const userSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

// GET /api/users - List all users
export async function GET(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        include: {
          posts: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
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
  } catch (error) {
    console.error('Error fetching users:', error);
    return apiError('Failed to fetch users', 500, request);
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = userSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return apiError('User with this email already exists', 409, request);
    }

    // Create user
    const user = await prisma.user.create({
      data: validatedData,
    });

    return apiResponse(user, 201, request);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError('Validation error', 400, request, error.errors);
    }
    console.error('Error creating user:', error);
    return apiError('Failed to create user', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request);
}

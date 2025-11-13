import { NextRequest } from 'next/server';
import { handleCors } from '@/lib/cors';
import { apiResponse, apiError } from '@/lib/response';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const postSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  authorId: z.string(),
  published: z.boolean().optional().default(false),
});

// GET /api/posts - List all posts
export async function GET(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const published = searchParams.get('published');
    const skip = (page - 1) * limit;

    const where = published !== null ? { published: published === 'true' } : {};

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.post.count({ where }),
    ]);

    return apiResponse(
      {
        posts,
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
    console.error('Error fetching posts:', error);
    return apiError('Failed to fetch posts', 500, request);
  }
}

// POST /api/posts - Create new post
export async function POST(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const body = await request.json();
    const validatedData = postSchema.parse(body);

    // Verify author exists
    const author = await prisma.user.findUnique({
      where: { id: validatedData.authorId },
    });

    if (!author) {
      return apiError('Author not found', 404, request);
    }

    const post = await prisma.post.create({
      data: validatedData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return apiResponse(post, 201, request);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError('Validation error', 400, request, error.errors);
    }
    console.error('Error creating post:', error);
    return apiError('Failed to create post', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request); return corsResponse || new NextResponse(null, { status: 204 });
}

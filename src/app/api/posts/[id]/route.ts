import { NextRequest } from 'next/server';
import { handleCors } from '@/lib/cors';
import { apiResponse, apiError } from '@/lib/response';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updatePostSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  published: z.boolean().optional(),
});

// GET /api/posts/[id] - Get post by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const { id } = await params;
    
    const post = await prisma.post.findUnique({
      where: { id },
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

    if (!post) {
      return apiError('Post not found', 404, request);
    }

    return apiResponse(post, 200, request);
  } catch (error) {
    console.error('Error fetching post:', error);
    return apiError('Failed to fetch post', 500, request);
  }
}

// PATCH /api/posts/[id] - Update post
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const { id } = await params;
    const body = await request.json();
    
    const validatedData = updatePostSchema.parse(body);

    const post = await prisma.post.update({
      where: { id },
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

    return apiResponse(post, 200, request);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError('Validation error', 400, request, error.errors);
    }
    console.error('Error updating post:', error);
    return apiError('Failed to update post', 500, request);
  }
}

// DELETE /api/posts/[id] - Delete post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const { id } = await params;
    
    await prisma.post.delete({
      where: { id },
    });

    return apiResponse({ message: 'Post deleted successfully' }, 200, request);
  } catch (error) {
    console.error('Error deleting post:', error);
    return apiError('Failed to delete post', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request);
}

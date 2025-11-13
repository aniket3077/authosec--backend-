import { NextRequest } from 'next/server';
import { handleCors } from '@/lib/cors';
import { apiResponse, apiError } from '@/lib/response';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  // Handle CORS preflight
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    return apiResponse(
      {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
      200,
      request
    );
  } catch (error) {
    return apiError(
      'Health check failed',
      503,
      request,
      { database: 'disconnected' }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request);
}

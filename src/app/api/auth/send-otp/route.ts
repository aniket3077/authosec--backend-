import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { z } from 'zod';

const sendOTPSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format')
});

// POST /api/auth/send-otp
export async function POST(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const body = await request.json();
    sendOTPSchema.parse(body);

    return apiError(
      'Phone-based authentication is managed directly by Clerk. Use the Clerk SDK from the client to request verification codes.',
      501,
      request
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return apiError('Validation error', 400, request, error.errors);
    }
    console.error('Send OTP error:', error);
    return apiError(error.message || 'Failed to process OTP request', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request); return corsResponse || new NextResponse(null, { status: 204 });
}

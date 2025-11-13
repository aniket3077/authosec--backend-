import { NextRequest, NextResponse } from 'next/server';
import { withCors } from './cors';

export function apiResponse<T>(
  data: T,
  status: number = 200,
  request: NextRequest
) {
  const response = NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
  
  return withCors(response, request);
}

export function apiError(
  message: string,
  status: number = 400,
  request: NextRequest,
  details?: any
) {
  const response = NextResponse.json(
    {
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
  
  return withCors(response, request);
}

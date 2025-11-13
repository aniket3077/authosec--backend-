import { NextRequest, NextResponse } from 'next/server';

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8081'];

export function corsHeaders(origin?: string) {
  const isAllowed = origin && allowedOrigins.some(allowed => 
    origin.startsWith(allowed) || allowed === '*'
  );

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleCors(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  return null;
}

export function withCors(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const headers = corsHeaders(origin);
  
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

import { NextRequest, NextResponse } from 'next/server';

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()).filter(Boolean) || [
  'http://localhost:8081',      // Expo web
  'http://localhost:19006',     // Expo web alternative
  'http://localhost:5173',      // Vite dev server (website)
  'http://10.0.2.2:8081',       // Android emulator
  'http://127.0.0.1:8081',      // Localhost
  'exp://localhost:8081',       // Expo development
  'exp://10.0.2.2:8081',        // Expo on Android emulator
];

export function corsHeaders(origin?: string) {
  const isAllowed = origin && allowedOrigins.some(allowed => 
    allowed === '*' || origin === allowed || origin.startsWith(allowed)
  );

  return {
    'Access-Control-Allow-Origin': isAllowed && origin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function handleCors(request: NextRequest): NextResponse | null {
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

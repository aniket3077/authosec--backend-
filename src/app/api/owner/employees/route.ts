import { NextRequest, NextResponse } from 'next/server';
import { handleCors } from '@/lib/cors';
import { apiResponse, apiError } from '@/lib/response';
import { verifyFirebaseToken, getUserByFirebaseUid } from '@/lib/firebase-auth';
import prisma from '@/lib/prisma';

// GET /api/owner/employees
export async function GET(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiError('Unauthorized - No token provided', 401, request);
    }

    const token = authHeader.slice(7).trim();
    const decodedToken = await verifyFirebaseToken(token);
    const user = await getUserByFirebaseUid(decodedToken.uid);
    if (!user) {
      return apiError('User not found', 404, request);
    }

    // Get all users with their company info
    const employees = await prisma.user.findMany({
      where: {
        companyId: user.companyId || undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to employee format with mock productivity data
    const employeeData = employees.map((emp) => ({
      id: emp.id,
      name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email,
      email: emp.email,
      role: emp.role,
      department: 'General', // Mock - should come from database
      productivity: Math.floor(Math.random() * 30) + 70, // Mock 70-100%
      status: 'active' as const,
      loginTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      tasksCompleted: Math.floor(Math.random() * 30) + 20,
      totalTasks: 50,
    }));

    return apiResponse(employeeData, 200, request);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return apiError('Failed to fetch employees', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request);
  return corsResponse || new NextResponse(null, { status: 204 });
}

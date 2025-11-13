import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { ClerkService } from '@/lib/clerk';
import { prisma } from '@/lib/prisma';

// GET /api/admin/dashboard
export async function GET(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const user = await ClerkService.getCurrentUser();
    if (!user) {
      return apiError('Unauthorized', 401, request);
    }

    // Only super admin can access
    if (!await ClerkService.isSuperAdmin()) {
      return apiError('Insufficient permissions', 403, request);
    }

    // Get stats
    const [
      totalCompanies,
      activeCompanies,
      totalUsers,
      activeUsers,
      totalTransactions,
      completedTransactions,
      pendingTransactions,
      failedTransactions,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.transaction.count(),
      prisma.transaction.count({ where: { status: 'COMPLETED' } }),
      prisma.transaction.count({
        where: {
          status: {
            in: ['INITIATED', 'QR1_SCANNED', 'QR2_GENERATED', 'QR2_SCANNED', 'OTP_SENT'],
          },
        },
      }),
      prisma.transaction.count({ where: { status: 'FAILED' } }),
    ]);

    // Recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        receiver: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Transaction volume by status
    const transactionsByStatus = await prisma.transaction.groupBy({
      by: ['status'],
      _count: true,
    });

    return apiResponse(
      {
        stats: {
          companies: {
            total: totalCompanies,
            active: activeCompanies,
          },
          users: {
            total: totalUsers,
            active: activeUsers,
          },
          transactions: {
            total: totalTransactions,
            completed: completedTransactions,
            pending: pendingTransactions,
            failed: failedTransactions,
          },
        },
        recentTransactions,
        transactionsByStatus,
      },
      200,
      request
    );
  } catch (error: any) {
    console.error('Get dashboard error:', error);
    return apiError(error.message || 'Failed to fetch dashboard data', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request);
}

import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyFirebaseToken } from '@/lib/firebase-auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/company/analytics
 * Get analytics data for company admin
 */
export async function GET(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return apiError('Unauthorized - No token provided', 401, request);
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyFirebaseToken(token);

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
    });

    if (!user || user.role !== 'COMPANY_ADMIN' || !user.companyId) {
      return apiError('Forbidden', 403, request);
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const days = parseInt(period);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // User growth over time
    const userGrowth = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM users
      WHERE company_id = ${user.companyId}
        AND created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Transaction volume over time
    const transactionVolume = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(CASE WHEN amount IS NOT NULL THEN amount ELSE 0 END) as total_amount
      FROM transactions
      WHERE company_id = ${user.companyId}
        AND created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Top users by transaction count
    const topUsers = await prisma.user.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        _count: {
          select: {
            sentTransactions: true,
            receivedTransactions: true,
          },
        },
      },
      orderBy: {
        sentTransactions: {
          _count: 'desc',
        },
      },
      take: 10,
    });

    // Transaction success rate
    const transactionStats = await prisma.transaction.groupBy({
      by: ['status'],
      where: {
        companyId: user.companyId,
        createdAt: {
          gte: startDate,
        },
      },
      _count: true,
    });

    const totalTransactions = transactionStats.reduce((sum, s) => sum + s._count, 0);
    const completedCount = transactionStats.find(s => s.status === 'COMPLETED')?._count || 0;
    const successRate = totalTransactions > 0 ? (completedCount / totalTransactions) * 100 : 0;

    // Average transaction time (initiated to completed)
    const avgTransactionTime = await prisma.$queryRaw`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (completed_at - initiated_at))) as avg_seconds
      FROM transactions
      WHERE company_id = ${user.companyId}
        AND status = 'COMPLETED'
        AND completed_at IS NOT NULL
        AND created_at >= ${startDate}
    `;

    return apiResponse(
      {
        period: days,
        userGrowth,
        transactionVolume,
        topUsers: topUsers.map(u => ({
          ...u,
          totalTransactions: u._count.sentTransactions + u._count.receivedTransactions,
        })),
        performance: {
          totalTransactions,
          successRate: Math.round(successRate * 100) / 100,
          avgTransactionTime: avgTransactionTime[0]?.avg_seconds || 0,
        },
        statusDistribution: transactionStats.map(s => ({
          status: s.status,
          count: s._count,
          percentage: Math.round((s._count / totalTransactions) * 10000) / 100,
        })),
      },
      200,
      request
    );
  } catch (error: any) {
    console.error('Analytics error:', error);
    return apiError(
      error.message || 'Failed to fetch analytics',
      500,
      request
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request) || new Response(null, { status: 200 });
}

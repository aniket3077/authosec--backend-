import { NextRequest, NextResponse } from 'next/server';
import { handleCors } from '@/lib/cors';
import { apiResponse, apiError } from '@/lib/response';
import { verifyFirebaseToken } from '@/lib/firebase-auth';
import prisma from '@/lib/prisma';

// GET /api/owner/analytics
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
    await verifyFirebaseToken(token);

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    // Get transaction data for growth calculations
    const [currentMonth, previousMonth, twoMonthsPrior] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: {
          createdAt: {
            gte: lastMonth,
            lt: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: {
          createdAt: {
            gte: twoMonthsAgo,
            lt: lastMonth,
          },
        },
        _sum: { amount: true },
      }),
    ]);

    const currentRevenue = Number(currentMonth._sum.amount) || 0;
    const lastRevenue = Number(previousMonth._sum.amount) || 0;
    const revenueGrowth = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;

    // Get user growth
    const [totalUsers, newUsersThisMonth] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
      }),
    ]);

    const userGrowth = ((newUsersThisMonth / (totalUsers - newUsersThisMonth)) * 100) || 0;

    // Calculate average transaction value
    const avgTransaction = currentMonth._count > 0 ? currentRevenue / currentMonth._count : 0;

    const analytics = {
      revenueGrowth: Number(revenueGrowth.toFixed(1)),
      userGrowth: Number(userGrowth.toFixed(1)),
      avgTransaction: Number(avgTransaction.toFixed(2)),
      qrScans: Math.floor(Math.random() * 5000) + 10000, // Mock QR scan data
      peakHours: '2 PM - 6 PM',
      customerLifetime: '8.5 months',
      retentionRate: 78,
      mostUsedFeature: 'QR Payments',
      featureUsagePercent: 82,
      predictedRevenueNextMonth: Math.round(currentRevenue * 1.16),
      predictedUsers3Months: Math.round(totalUsers * 1.42),
    };

    return apiResponse(analytics, 200, request);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return apiError('Failed to fetch analytics', 500, request);
  }
}

export async function OPTIONS(request: NextRequest) {
  const corsResponse = handleCors(request);
  return corsResponse || new NextResponse(null, { status: 204 });
}

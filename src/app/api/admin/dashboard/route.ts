import { NextRequest } from 'next/server';
import { apiResponse } from '@/lib/response';
import { handleCors } from '@/lib/cors';
import { verifyAdminAccess } from '@/middleware/admin';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/dashboard
 * Admin dashboard with system-wide statistics
 * Only accessible by SUPER_ADMIN or users with admin emails
 */
export async function GET(request: NextRequest) {
  const corsResponse = handleCors(request);
  if (corsResponse) return corsResponse;

  const { error, user } = await verifyAdminAccess(request);
  if (error) return error;

  try {
    // Get system-wide statistics
    const totalCompanies = await prisma.company.count();
    const activeCompanies = await prisma.company.count({
      where: { isActive: true },
    });

    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: { isActive: true },
    });

    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: true,
    });

    const totalTransactions = await prisma.transaction.count();
    const completedTransactions = await prisma.transaction.count({
      where: { status: 'COMPLETED' },
    });

    const transactionAmounts = await prisma.transaction.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { amount: true },
    });

    // Recent companies
    const recentCompanies = await prisma.company.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionTier: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            transactions: true,
          },
        },
      },
    });

    // Recent users
    const recentUsers = await prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // System health indicators
    const systemHealth = {
      databaseConnected: true,
      activeCompanies,
      activeUsers,
    };

    return apiResponse(
      {
        admin: {
          id: user!.id,
          email: user!.email,
          role: user!.role,
        },
        stats: {
          companies: {
            total: totalCompanies,
            active: activeCompanies,
            inactive: totalCompanies - activeCompanies,
          },
          users: {
            total: totalUsers,
            active: activeUsers,
            inactive: totalUsers - activeUsers,
            byRole: usersByRole.map(r => ({
              role: r.role,
              count: r._count,
            })),
          },
          transactions: {
            total: totalTransactions,
            completed: completedTransactions,
            totalAmount: transactionAmounts._sum.amount || 0,
          },
        },
        recentCompanies,
        recentUsers,
        systemHealth,
      },
      200,
      request
    );
  } catch (error: any) {
    console.error('Admin dashboard error:', error);
    return apiResponse(
      { error: error.message || 'Failed to fetch admin dashboard' },
      500,
      request
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return handleCors(request) || new Response(null, { status: 200 });
}

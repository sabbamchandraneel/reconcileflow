import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { inMemoryStore } from '@/lib/store';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try fetching from Prisma DB
    try {
      if (process.env.DATABASE_URL) {
        const dbRuns = await prisma.reconciliation.findMany({
          where: { userId: user.userId },
          orderBy: { createdAt: 'desc' },
          include: {
            discrepancies: true,
          },
        });

        if (dbRuns && dbRuns.length > 0) {
          const formatted = dbRuns.map((r) => ({
            id: r.id,
            userId: r.userId,
            title: r.title,
            status: r.status,
            summary: r.summaryJson ? JSON.parse(r.summaryJson) : {},
            discrepancies: r.discrepancies,
            ordersCount: r.totalOrdersCount,
            paymentsCount: r.totalPaymentsCount,
            createdAt: r.createdAt.toISOString(),
          }));
          return NextResponse.json({ success: true, reconciliations: formatted });
        }
      }
    } catch (dbErr) {
      console.warn('DB fetch error, falling back to memory store:', dbErr);
    }

    // Fallback to in-memory store
    const userRuns = inMemoryStore.reconciliations.get(user.userId) || [];
    return NextResponse.json({ success: true, reconciliations: userRuns });
  } catch (error) {
    console.error('Fetch reconciliations error:', error);
    return NextResponse.json({ error: 'Failed to retrieve reconciliations' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { inMemoryStore } from '@/lib/store';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let userDetails = {
      id: session.userId,
      email: session.email,
      name: session.name,
    };

    if (process.env.DATABASE_URL) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { id: true, email: true, name: true },
        });
        if (dbUser) {
          userDetails = {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name || session.name,
          };
        }
      } catch (dbErr) {
        console.warn('Prisma lookup error in /api/auth/me:', dbErr);
      }
    } else {
      const memUser = inMemoryStore.users.get(session.email);
      if (memUser) {
        userDetails = {
          id: memUser.id,
          email: memUser.email,
          name: memUser.name || session.name,
        };
      }
    }

    return NextResponse.json({ authenticated: true, user: userDetails });
  } catch (error) {
    return NextResponse.json({ authenticated: false, error: 'Session check failed' }, { status: 500 });
  }
}


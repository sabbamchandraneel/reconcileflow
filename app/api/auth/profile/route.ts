import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, hashPassword, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let user = null;
    if (process.env.DATABASE_URL) {
      try {
        user = await prisma.user.findUnique({
          where: { id: session.userId },
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        });
      } catch (dbErr) {
        console.warn('Prisma profile lookup error:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      user: user || {
        id: session.userId,
        email: session.email,
        name: session.name || 'Financial Auditor',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, currentPassword, newPassword } = await req.json();

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: true,
        message: 'Profile updated in session memory mode',
        user: { id: session.userId, email: session.email, name: name || session.name },
      });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    let updatedPasswordHash = dbUser.passwordHash;

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to set a new password' },
          { status: 400 }
        );
      }

      const isCurrentValid = await verifyPassword(currentPassword, dbUser.passwordHash);
      if (!isCurrentValid) {
        return NextResponse.json({ error: 'Current password does not match' }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters' },
          { status: 400 }
        );
      }

      updatedPasswordHash = await hashPassword(newPassword);
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: name !== undefined ? name : dbUser.name,
        passwordHash: updatedPasswordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Profile PUT error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

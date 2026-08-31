import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, createAuthToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { inMemoryStore } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const hashedPassword = await hashPassword(password);
    let userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let userName = name?.trim() || normalizedEmail.split('@')[0];

    // Try persisting to Prisma PostgreSQL database if configured
    try {
      if (process.env.DATABASE_URL) {
        const existingUser = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (existingUser) {
          return NextResponse.json(
            { error: 'A user with this email already exists' },
            { status: 409 }
          );
        }

        const dbUser = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: userName,
            passwordHash: hashedPassword,
          },
        });
        userId = dbUser.id;
        userName = dbUser.name || userName;
      } else {
        // In-memory fallback
        if (inMemoryStore.users.has(normalizedEmail)) {
          return NextResponse.json(
            { error: 'A user with this email already exists' },
            { status: 409 }
          );
        }
        inMemoryStore.users.set(normalizedEmail, {
          id: userId,
          email: normalizedEmail,
          name: userName,
          passwordHash: hashedPassword,
        });
      }
    } catch (dbErr) {
      console.warn('Database write fallback to in-memory store:', dbErr);
      inMemoryStore.users.set(normalizedEmail, {
        id: userId,
        email: normalizedEmail,
        name: userName,
        passwordHash: hashedPassword,
      });
    }

    const token = await createAuthToken({
      userId,
      email: normalizedEmail,
      name: userName,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: userId, email: normalizedEmail, name: userName },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create user account' },
      { status: 500 }
    );
  }
}

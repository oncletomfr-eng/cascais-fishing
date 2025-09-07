/**
 * Credentials Verification API Route
 * Verifies user credentials with bcrypt in Node.js runtime
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email и пароль обязательны' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        password: true,
        role: true, // ✅ ИСПРАВЛЕНИЕ: добавляем роль для admin access
      }
    })

    if (!user) {
      return NextResponse.json(
        { message: 'Пользователь не найден' },
        { status: 401 }
      )
    }

    // Check password if user has one (some users might be OAuth-only)
    if (!user.password) {
      return NextResponse.json(
        { message: 'Этот аккаунт использует OAuth авторизацию' },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Неверный пароль' },
        { status: 401 }
      )
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword)

  } catch (error) {
    console.error('Credentials verification error:', error)
    
    return NextResponse.json(
      { message: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

// Ensure this API route runs in Node.js runtime
export const runtime = 'nodejs'

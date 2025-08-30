import { NextRequest, NextResponse } from 'next/server'
import { adminLogin } from '@/app/actions/admin'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const password = formData.get('password') as string

    if (!password) {
      return NextResponse.json(
        { success: false, message: 'Password is required' },
        { status: 400 }
      )
    }

    const result = await adminLogin(password)
    
    if (result.success) {
      // Для обычных API запросов возвращаем JSON
      return NextResponse.json({
        success: true,
        message: result.message
      })
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { success: false, message: 'Login failed' },
      { status: 500 }
    )
  }
}
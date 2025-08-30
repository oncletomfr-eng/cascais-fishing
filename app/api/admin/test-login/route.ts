import { NextRequest, NextResponse } from 'next/server'
import { validateAdminPassword, generateAdminSession } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const password = formData.get('password') as string

    console.log('Test login - password received:', password)

    if (!password) {
      return NextResponse.json({
        success: false,
        message: 'Password is required',
        debug: { passwordLength: 0 }
      })
    }

    const isValid = validateAdminPassword(password)
    console.log('Password validation result:', isValid)

    if (!isValid) {
      return NextResponse.json({
        success: false,
        message: 'Invalid password',
        debug: { passwordLength: password.length, isValid }
      })
    }

    const sessionToken = generateAdminSession()
    console.log('Session token generated:', sessionToken ? 'YES' : 'NO')

    return NextResponse.json({
      success: true,
      message: 'Test login successful (no cookie set)',
      debug: {
        passwordLength: password.length,
        isValid,
        sessionToken: sessionToken.substring(0, 20) + '...'
      }
    })

  } catch (error) {
    console.error('Test login error:', error)
    return NextResponse.json({
      success: false,
      message: 'Test login failed',
      error: error.message
    })
  }
}

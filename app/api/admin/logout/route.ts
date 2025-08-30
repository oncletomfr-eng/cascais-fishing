import { NextResponse } from 'next/server'
import { adminLogout } from '@/app/actions/admin'

export async function POST() {
  try {
    const result = await adminLogout()
    
    if (result.success) {
      return NextResponse.json({ success: true, message: result.message })
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Logout API error:', error)
    return NextResponse.json(
      { success: false, message: 'Logout failed' },
      { status: 500 }
    )
  }
}

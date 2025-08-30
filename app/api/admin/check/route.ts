import { NextRequest, NextResponse } from 'next/server'
import { validateAdminPassword } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const envPassword = process.env.ADMIN_PASSWORD
  const defaultPassword = 'admin123'
  
  return NextResponse.json({
    envPasswordExists: !!envPassword,
    envPasswordValue: envPassword || 'NOT_SET',
    defaultPassword,
    testValidation: {
      'qwerty123': validateAdminPassword('qwerty123'),
      'admin123': validateAdminPassword('admin123'),
      'wrong': validateAdminPassword('wrong')
    }
  })
}

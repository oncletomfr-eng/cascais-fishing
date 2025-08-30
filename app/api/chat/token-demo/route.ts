import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

/**
 * 🧪 DEMO API для токенов чата (без реального Stream Chat)
 * Для тестирования многофазной системы чатов
 */

export async function POST(request: NextRequest) {
  try {
    // Получить сессию
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized - user not authenticated' 
      }, { status: 401 })
    }

    const userId = session.user.id
    const userName = session.user.name || 'Anonymous User'

    console.log('🔑 Generating DEMO chat token for user:', userId)

    // Создаем демо токен (в реальности это будет Stream Chat token)
    const demoToken = `demo_token_${userId}_${Date.now()}`

    console.log('✅ DEMO chat token generated successfully for user:', userId)

    return NextResponse.json({
      success: true,
      token: demoToken,
      user: {
        id: userId,
        name: userName,
        image: session.user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0ea5e9&color=fff`,
      },
      demo: true,
      message: 'This is a demo token for testing purposes'
    })

  } catch (error) {
    console.error('❌ Error generating demo chat token:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate demo chat token'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        image: session.user.image,
        isOnline: true,
        lastSeen: new Date().toISOString(),
      },
      demo: true
    })

  } catch (error) {
    console.error('❌ Error getting demo user chat status:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user status'
    }, { status: 500 })
  }
}

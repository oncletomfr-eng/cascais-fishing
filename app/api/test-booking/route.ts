import { NextRequest, NextResponse } from 'next/server'
import { createTestBooking } from '@/app/actions/cancel-participant'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tripId, participantName, action } = body

    console.log('🧪 Test booking API called:', { tripId, participantName, action })

    if (!tripId) {
      return NextResponse.json({
        success: false,
        error: 'tripId is required'
      }, { status: 400 })
    }

    if (action === 'create') {
      const result = await createTestBooking(tripId, participantName)
      
      return NextResponse.json(result, {
        status: result.success ? 200 : 400
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Unknown action'
    }, { status: 400 })

  } catch (error) {
    console.error('❌ Error in test booking API:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { cancelParticipant, getTripCancellationStats } from '@/app/actions/cancel-participant'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, reason } = body

    console.log('🚫 Cancel participant API called:', { bookingId, reason })

    if (!bookingId) {
      return NextResponse.json({
        success: false,
        error: 'bookingId is required'
      }, { status: 400 })
    }

    const result = await cancelParticipant(bookingId, reason)
    
    return NextResponse.json(result, {
      status: result.success ? 200 : 400
    })

  } catch (error) {
    console.error('❌ Error in cancel participant API:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tripId = searchParams.get('tripId')

    if (!tripId) {
      return NextResponse.json({
        success: false,
        error: 'tripId parameter is required'
      }, { status: 400 })
    }

    console.log('📊 Getting cancellation stats for trip:', tripId)

    const result = await getTripCancellationStats(tripId)
    
    return NextResponse.json(result, {
      status: result.success ? 200 : 400
    })

  } catch (error) {
    console.error('❌ Error getting cancellation stats:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { StreamChat } from 'stream-chat'
import { prisma } from '@/lib/prisma'
import { 
  ChatPhase, 
  EventChat, 
  DEFAULT_PHASE_CONFIGS,
  CustomMessageType,
  CustomMessageData,
  WeatherUpdatePayload,
  CatchPhotoPayload,
  LocationSharePayload,
  FishingTipPayload
} from '@/lib/types/multi-phase-chat'

const serverClient = StreamChat.getInstance(
  process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY!,
  process.env.STREAM_CHAT_API_SECRET!
)

/**
 * 💬 API для управления многофазными чатами рыболовных событий
 */

// Создание или получение многофазного чата для поездки
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const body = await request.json()
    const { 
      tripId, 
      action = 'create',  // 'create' | 'get' | 'switch_phase' | 'send_custom'
      phase,
      customMessage
    } = body

    if (!tripId) {
      return NextResponse.json({
        success: false,
        error: 'tripId is required'
      }, { status: 400 })
    }

    const userId = session.user.id

    console.log(`💬 Multi-phase chat ${action}:`, { tripId, phase, userId })

    // Получить данные о поездке
    const trip = await prisma.groupTrip.findUnique({
      where: { id: tripId },
      include: {
        bookings: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] }
          },
          include: { user: true }
        },
        captain: true
      }
    })

    if (!trip) {
      return NextResponse.json({
        success: false,
        error: 'Trip not found'
      }, { status: 404 })
    }

    // Проверить права доступа (участник или капитан)
    const isParticipant = trip.bookings.some(b => b.user?.id === userId)
    const isCaptain = trip.captain?.id === userId

    if (!isParticipant && !isCaptain) {
      return NextResponse.json({
        success: false,
        error: 'Access denied. You must be a trip participant or captain.'
      }, { status: 403 })
    }

    switch (action) {
      case 'create':
        return await createMultiPhaseChat(tripId, trip, userId)
      
      case 'get':
        return await getMultiPhaseChat(tripId, userId)
      
      case 'switch_phase':
        if (!phase) {
          return NextResponse.json({
            success: false,
            error: 'phase is required for switch_phase action'
          }, { status: 400 })
        }
        return await switchChatPhase(tripId, phase as ChatPhase, userId)
      
      case 'send_custom':
        if (!customMessage) {
          return NextResponse.json({
            success: false,
            error: 'customMessage is required for send_custom action'
          }, { status: 400 })
        }
        return await sendCustomMessage(tripId, customMessage, userId)
      
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Error in multi-phase chat API:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Создать многофазный чат с тремя каналами
async function createMultiPhaseChat(tripId: string, trip: any, userId: string) {
  console.log(`🔧 Creating multi-phase chat for trip ${tripId}`)

  const phases: ChatPhase[] = ['preparation', 'live', 'debrief']
  const channels: Record<ChatPhase, any> = {} as any
  const eventChat: EventChat = {
    phases: {} as any,
    features: {
      weatherUpdates: true,
      catchPhotos: true, 
      locationSharing: true,
      tipSharing: true
    }
  }

  // Создать канал для каждой фазы
  for (const phase of phases) {
    const channelId = `trip-${tripId}-${phase}`
    const config = DEFAULT_PHASE_CONFIGS[phase]

    try {
      // Создать канал в Stream Chat
      const channel = serverClient.channel('messaging', channelId, {
        name: `${config.title} - ${trip.description || 'Рыболовная поездка'}`,
        description: config.description,
        created_by_id: userId,
        
        // Кастомные метаданные
        trip_id: tripId,
        chat_phase: phase,
        phase_config: config,
        
        // Настройки канала
        members: [userId], // Добавим участников позже
        frozen: phase !== 'preparation', // Заморозить неактивные фазы
        
        // Кастомные поля для фазы
        phase_features: config.allowedFeatures,
        auto_messages: config.autoMessages,
        time_restrictions: config.timeRestrictions
      })

      await channel.create()

      // Добавить всех участников и капитана
      const allMembers = [
        userId,
        trip.captain?.id,
        ...trip.bookings.map((b: any) => b.user?.id).filter(Boolean)
      ].filter((id, index, self) => id && self.indexOf(id) === index)

      if (allMembers.length > 1) {
        await channel.addMembers(allMembers)
      }

      channels[phase] = {
        channelId,
        phase,
        channel: null, // Будет заполнен на клиенте
        isActive: phase === 'preparation',
        phaseConfig: config,
        streamChannelId: channel.id
      }

      // Отправить приветственные сообщения
      const welcomeMsg = config.autoMessages.find(m => m.type === 'welcome')
      if (welcomeMsg) {
        await channel.sendMessage({
          text: welcomeMsg.content,
          user_id: 'system',
          type: 'system',
          custom_type: 'auto_message',
          auto_message_type: welcomeMsg.type
        })
      }

      console.log(`✅ Created ${phase} channel: ${channelId}`)

    } catch (error) {
      console.error(`❌ Error creating ${phase} channel:`, error)
      throw error
    }
  }

  // Создать объект EventChat
  eventChat.phases = {
    preparation: channels.preparation,
    live: channels.live, 
    debrief: channels.debrief
  }

  return NextResponse.json({
    success: true,
    data: {
      eventChat,
      currentPhase: 'preparation',
      tripId,
      message: 'Multi-phase chat created successfully'
    }
  })
}

// Получить существующий многофазный чат
async function getMultiPhaseChat(tripId: string, userId: string) {
  console.log(`📖 Getting multi-phase chat for trip ${tripId}`)

  const phases: ChatPhase[] = ['preparation', 'live', 'debrief']
  const channels: Record<ChatPhase, any> = {} as any

  // Определить текущую фазу на основе времени поездки
  const trip = await prisma.groupTrip.findUnique({
    where: { id: tripId }
  })

  if (!trip) {
    throw new Error('Trip not found')
  }

  const now = new Date()
  const tripDate = new Date(trip.date)
  const daysDiff = (tripDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

  let currentPhase: ChatPhase
  if (daysDiff > 0) {
    currentPhase = 'preparation'
  } else if (daysDiff > -1) {
    currentPhase = 'live'  
  } else {
    currentPhase = 'debrief'
  }

  // Получить каналы для каждой фазы
  for (const phase of phases) {
    const channelId = `trip-${tripId}-${phase}`
    
    try {
      const channel = serverClient.channel('messaging', channelId)
      await channel.query()

      channels[phase] = {
        channelId,
        phase,
        channel: null,
        isActive: phase === currentPhase,
        phaseConfig: DEFAULT_PHASE_CONFIGS[phase],
        streamChannelId: channel.id
      }

    } catch (error) {
      console.warn(`Channel ${channelId} not found, will create when needed`)
      channels[phase] = {
        channelId,
        phase,
        channel: null,
        isActive: false,
        phaseConfig: DEFAULT_PHASE_CONFIGS[phase],
        streamChannelId: null
      }
    }
  }

  const eventChat: EventChat = {
    phases: {
      preparation: channels.preparation,
      live: channels.live,
      debrief: channels.debrief
    },
    features: {
      weatherUpdates: true,
      catchPhotos: true,
      locationSharing: true,
      tipSharing: true
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      eventChat,
      currentPhase,
      tripId
    }
  })
}

// Переключить фазу чата
async function switchChatPhase(tripId: string, newPhase: ChatPhase, userId: string) {
  console.log(`🔄 Switching chat phase for trip ${tripId} to ${newPhase}`)

  const phases: ChatPhase[] = ['preparation', 'live', 'debrief']

  // Заморозить все каналы кроме активного
  for (const phase of phases) {
    const channelId = `trip-${tripId}-${phase}`
    
    try {
      const channel = serverClient.channel('messaging', channelId)
      await channel.query()

      if (phase === newPhase) {
        // Разморозить активный канал
        await channel.update({ frozen: false })
        
        // Отправить уведомление о начале фазы
        const config = DEFAULT_PHASE_CONFIGS[phase]
        await channel.sendMessage({
          text: `🎯 Начинается фаза "${config.title}"! ${config.description}`,
          user_id: 'system',
          type: 'system',
          custom_type: 'phase_transition',
          phase: newPhase
        })
      } else {
        // Заморозить неактивные каналы
        await channel.update({ frozen: true })
      }

    } catch (error) {
      console.warn(`Failed to update channel ${channelId}:`, error)
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      currentPhase: newPhase,
      tripId,
      message: `Switched to ${newPhase} phase`
    }
  })
}

// Отправить кастомное сообщение
async function sendCustomMessage(tripId: string, messageData: any, userId: string) {
  console.log(`📨 Sending custom message for trip ${tripId}:`, messageData.type)

  const { type, payload, phase = 'live' } = messageData as {
    type: CustomMessageType
    payload: WeatherUpdatePayload | CatchPhotoPayload | LocationSharePayload | FishingTipPayload
    phase: ChatPhase
  }

  const channelId = `trip-${tripId}-${phase}`

  try {
    const channel = serverClient.channel('messaging', channelId)
    await channel.query()

    const customMessage: CustomMessageData = {
      type,
      payload,
      timestamp: new Date(),
      phase,
      tripId,
      authorId: userId
    }

    // Отправить сообщение с кастомными данными
    const result = await channel.sendMessage({
      text: generateCustomMessageText(type, payload),
      user_id: userId,
      type: 'custom',
      custom_type: type,
      custom_data: customMessage,
      
      // Вложения для фото и файлов
      ...(type === 'catch_photo' && payload && 'imageUrl' in payload ? {
        attachments: [{
          type: 'image',
          image_url: payload.imageUrl,
          title: `Улов: ${payload.fishSpecies || 'Неизвестный вид'}`,
          fallback: 'Фото улова'
        }]
      } : {})
    })

    return NextResponse.json({
      success: true,
      data: {
        messageId: result.message.id,
        customMessage,
        channelId
      }
    })

  } catch (error) {
    console.error('❌ Error sending custom message:', error)
    throw error
  }
}

// Генерировать текст для кастомного сообщения
function generateCustomMessageText(type: CustomMessageType, payload: any): string {
  switch (type) {
    case 'weather_update':
      const weather = payload as WeatherUpdatePayload
      return `🌤️ Погода: ${weather.condition}, ${weather.temperature}°C, ветер ${weather.windSpeed} км/ч, волны ${weather.waveHeight}м`
    
    case 'catch_photo':
      const catchData = payload as CatchPhotoPayload
      return `🐟 Улов! ${catchData.fishSpecies ? `${catchData.fishSpecies}` : 'Рыба'}${catchData.fishSize ? ` (${catchData.fishSize}см)` : ''}${catchData.fishWeight ? ` ${catchData.fishWeight}кг` : ''}`
    
    case 'location_share':
      const location = payload as LocationSharePayload
      return `📍 Локация: ${location.locationName || 'Координаты'} (${location.coordinates.lat.toFixed(4)}, ${location.coordinates.lng.toFixed(4)})`
    
    case 'fishing_tip':
      const tip = payload as FishingTipPayload
      return `💡 Совет: ${tip.title}\n${tip.description}`
    
    default:
      return 'Кастомное сообщение'
  }
}

// Получить статистику чата (GET запрос)
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tripId = searchParams.get('tripId')
    const phase = searchParams.get('phase') as ChatPhase | null

    if (!tripId) {
      return NextResponse.json({
        success: false,
        error: 'tripId parameter is required'
      }, { status: 400 })
    }

    // Получить статистику для всех фаз или конкретной фазы
    const phases = phase ? [phase] : (['preparation', 'live', 'debrief'] as ChatPhase[])
    const stats: Record<string, any> = {}

    for (const phaseKey of phases) {
      const channelId = `trip-${tripId}-${phaseKey}`
      
      try {
        const channel = serverClient.channel('messaging', channelId)
        const channelState = await channel.query({
          messages: { limit: 100 }
        })

        const messages = channelState.messages || []
        const customMessages = messages.filter(m => m.type === 'custom')

        stats[phaseKey] = {
          phase: phaseKey,
          messagesCount: messages.length,
          participantsCount: Object.keys(channelState.members || {}).length,
          customMessagesCount: customMessages.reduce((acc, m) => {
            const type = m.custom_type || 'other'
            acc[type] = (acc[type] || 0) + 1
            return acc
          }, {} as Record<string, number>),
          lastActivity: messages.length > 0 ? messages[messages.length - 1].created_at : null,
          channelExists: true
        }

      } catch (error) {
        stats[phaseKey] = {
          phase: phaseKey,
          messagesCount: 0,
          participantsCount: 0,
          customMessagesCount: {},
          lastActivity: null,
          channelExists: false,
          error: 'Channel not found'
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        tripId,
        stats
      }
    })

  } catch (error) {
    console.error('❌ Error getting chat stats:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { StreamChat } from 'stream-chat';
import prisma from '@/lib/prisma';

const serverClient = StreamChat.getInstance(
  process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY!,
  process.env.STREAM_CHAT_API_SECRET!
);

const prisma = new PrismaClient();

// Create or join trip chat channel
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Unauthorized' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { tripId, action = 'join' } = body; // action: 'create' | 'join' | 'leave'

    if (!tripId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'tripId is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = session.user.id;
    const channelId = `trip-${tripId}`;

    console.log(`🔗 ${action} trip chat channel:`, channelId, 'for user:', userId);

    // Get trip details from database
    const trip = await prisma.groupTrip.findUnique({
      where: { id: tripId },
      include: {
        participants: {
          include: {
            user: true
          }
        },
        captain: true
      }
    });

    if (!trip) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Trip not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user is participant or captain
    const isParticipant = trip.participants.some(p => p.user.id === userId);
    const isCaptain = trip.captain.id === userId;

    if (!isParticipant && !isCaptain && action !== 'leave') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Only participants and captain can join trip chat'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get or create channel
    const channel = serverClient.channel('messaging', channelId, {
      name: `Поездка ${new Date(trip.date).toLocaleDateString('ru-RU')}`,
      created_by_id: trip.captain.id,
      members: [],
      // Trip-specific metadata
      trip_id: tripId,
      trip_date: trip.date.toISOString(),
      trip_time_slot: trip.timeSlot,
      meeting_point: 'Cascais Marina',
      captain_name: trip.captain.name,
      max_participants: trip.maxParticipants,
      // Channel settings
      typing_events: true,
      read_events: true,
      connect_events: true,
      search: true,
      reactions: true,
      replies: true,
      uploads: true,
      url_enrichment: true,
    });

    let result;

    switch (action) {
      case 'create':
      case 'join':
        // Add user to channel
        await channel.addMembers([userId]);
        
        // Send welcome message for new participants (except captain)
        if (!isCaptain && action === 'join') {
          await channel.sendMessage({
            text: `${session.user.name} присоединился к чату поездки! 🎣`,
            user_id: 'system',
            silent: true,
          }, { skip_push: true });
        }
        
        result = {
          success: true,
          channel: {
            id: channelId,
            type: 'messaging',
            name: channel.data?.name,
            memberCount: (await channel.query()).members?.length || 0,
          },
          action: 'joined'
        };
        break;

      case 'leave':
        // Remove user from channel
        await channel.removeMembers([userId]);
        
        // Send goodbye message
        if (!isCaptain) {
          await channel.sendMessage({
            text: `${session.user.name} покинул чат поездки`,
            user_id: 'system',
            silent: true,
          }, { skip_push: true });
        }
        
        result = {
          success: true,
          channel: {
            id: channelId,
            type: 'messaging',
          },
          action: 'left'
        };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`✅ Successfully ${action}ed trip chat:`, channelId);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error managing trip chat channel:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to manage chat channel'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Get user's active trip channels
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Unauthorized' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = session.user.id;

    console.log('📋 Getting active trip channels for user:', userId);

    // Get user's channels from Stream
    const filter = { 
      type: 'messaging', 
      members: { $in: [userId] },
      trip_id: { $exists: true } 
    };
    const sort = { last_message_at: -1 };

    const channels = await serverClient.queryChannels(filter, sort, {
      state: true,
      watch: false,
      presence: false,
    });

    const channelList = channels.map(channel => {
      const data = channel.data;
      const state = channel.state;
      
      return {
        id: channel.id,
        name: data?.name || 'Trip Chat',
        tripId: data?.trip_id,
        tripDate: data?.trip_date,
        tripTimeSlot: data?.trip_time_slot,
        meetingPoint: data?.meeting_point,
        captainName: data?.captain_name,
        maxParticipants: data?.max_participants,
        memberCount: state?.memberCount || 0,
        lastMessageAt: state?.last_message_at,
        unreadCount: state?.unreadCount || 0,
      };
    });

    console.log(`✅ Found ${channelList.length} active trip channels`);

    return new Response(JSON.stringify({
      success: true,
      channels: channelList
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error getting trip channels:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get trip channels'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

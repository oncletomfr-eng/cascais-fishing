import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { StreamChat } from 'stream-chat';

// Initialize Stream Chat server-side client
const serverClient = StreamChat.getInstance(
  process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY!,
  process.env.STREAM_CHAT_API_SECRET!
);

// Generate user token for Stream Chat authentication
export async function POST(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await auth();
    
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Unauthorized - user not authenticated' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = session.user.id;
    const userName = session.user.name || 'Anonymous User';
    const userEmail = session.user.email || '';

    console.log('🔑 Generating Stream Chat token for user:', userId);

    // Create or update user in Stream
    const streamUser = {
      id: userId,
      name: userName,
      email: userEmail,
      image: session.user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0ea5e9&color=fff`,
      role: 'user',
      // Additional user metadata for fishing trips
      isOnline: true,
      lastSeen: new Date().toISOString(),
    };

    // Update user on Stream Chat servers
    await serverClient.upsertUser(streamUser);

    // Generate user token
    const token = serverClient.createUserToken(userId);

    console.log('✅ Stream Chat token generated successfully for user:', userId);

    return new Response(JSON.stringify({
      success: true,
      token,
      user: {
        id: userId,
        name: userName,
        image: streamUser.image,
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error generating Stream Chat token:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate chat token'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Get current user chat status
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

    // Check if user exists in Stream Chat
    const { users } = await serverClient.queryUsers({ id: userId });
    const streamUser = users[0];

    if (!streamUser) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User not found in chat system'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: streamUser.id,
        name: streamUser.name,
        image: streamUser.image,
        isOnline: streamUser.online,
        lastSeen: streamUser.last_active,
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error getting user chat status:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user status'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
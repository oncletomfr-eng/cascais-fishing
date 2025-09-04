import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateUserToken, getStreamChatServerClient } from '@/lib/config/stream-chat';

// Generate user token for Stream Chat authentication
export async function POST(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized - user not authenticated',
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    const userId = session.user.id;
    const userName = session.user.name || 'Anonymous User';
    const userEmail = session.user.email || '';

    console.log('🔑 Generating Stream Chat token for user:', userId);

    // Use production-ready token generation
    const tokenResult = await generateUserToken(userId, {
      name: userName,
      email: userEmail,
      image: session.user.image || undefined,
      role: 'user',
      // Additional fishing app metadata
      profile_type: 'fisher',
      account_type: 'standard',
      registration_date: new Date().toISOString()
    });

    console.log('✅ Stream Chat token generated successfully for user:', userId);

    return NextResponse.json({
      success: true,
      token: tokenResult.token,
      user: {
        id: userId,
        name: userName,
        image: tokenResult.user.image,
        email: userEmail
      },
      expiresAt: tokenResult.expiresAt?.toISOString(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error generating Stream Chat token:', error);
    
    // Return detailed error in development, generic in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorMessage = isDevelopment && error instanceof Error 
      ? error.message 
      : 'Token generation failed';

    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Get current user chat status
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized',
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    const userId = session.user.id;

    // Use production-ready client
    const serverClient = getStreamChatServerClient();
    
    // Check if user exists in Stream Chat
    const { users } = await serverClient.queryUsers({ id: userId });
    const streamUser = users[0];

    if (!streamUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found in chat system',
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: streamUser.id,
        name: streamUser.name,
        image: streamUser.image,
        isOnline: streamUser.online,
        lastSeen: streamUser.last_active,
        profileType: (streamUser as any).profile_type,
        accountType: (streamUser as any).account_type
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting user chat status:', error);
    
    // Return appropriate error message for production vs development
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorMessage = isDevelopment && error instanceof Error 
      ? error.message 
      : 'Failed to get user status';
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
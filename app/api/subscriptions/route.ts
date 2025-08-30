import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { stripe, createStripeCustomer, createCaptainSubscription } from '@/lib/stripe';

// GET /api/subscriptions - получить подписки пользователя
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем подписки из базы данных
    const subscriptions = await prisma.subscription.findMany({
      where: {
        user: {
          email: session.user.email
        }
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        payments: {
          where: { type: 'SUBSCRIPTION' },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ 
      success: true,
      subscriptions 
    });

  } catch (error) {
    console.error('❌ Subscriptions GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}

// POST /api/subscriptions - создать новую подписку капитана
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { priceId, tier = 'CAPTAIN_PREMIUM' } = body;

    // Валидация
    if (tier !== 'CAPTAIN_PREMIUM') {
      return NextResponse.json(
        { error: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Проверяем, есть ли уже активная подписка
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE'
      }
    });

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'User already has an active subscription' },
        { status: 409 }
      );
    }

    // Получаем или создаем Stripe customer
    let stripeCustomerId: string;
    
    const existingCustomer = await prisma.subscription.findFirst({
      where: { 
        userId: user.id,
        stripeCustomerId: { not: null }
      },
      select: { stripeCustomerId: true }
    });

    if (existingCustomer?.stripeCustomerId) {
      stripeCustomerId = existingCustomer.stripeCustomerId;
    } else {
      const stripeCustomer = await createStripeCustomer(
        user.email,
        user.name || undefined,
        {
          userId: user.id,
          source: 'captain_subscription'
        }
      );
      stripeCustomerId = stripeCustomer.id;
    }

    // Создаем подписку в Stripe согласно документации
    const stripeSubscription = await createCaptainSubscription(
      stripeCustomerId,
      priceId
    );

    // Сохраняем подписку в базе данных
    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        stripeCustomerId,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: priceId,
        tier,
        status: stripeSubscription.status === 'active' ? 'ACTIVE' : 'INACTIVE',
        currentPeriodStart: stripeSubscription.current_period_start 
          ? new Date(stripeSubscription.current_period_start * 1000) 
          : undefined,
        currentPeriodEnd: stripeSubscription.current_period_end 
          ? new Date(stripeSubscription.current_period_end * 1000)
          : undefined,
        metadata: {
          created_via: 'api',
          stripe_subscription_status: stripeSubscription.status
        }
      }
    });

    console.log('✅ Captain subscription created:', {
      subscriptionId: subscription.id,
      stripeSubscriptionId: stripeSubscription.id,
      tier,
      status: subscription.status
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        stripeSubscriptionId: subscription.stripeSubscriptionId
      },
      clientSecret: (stripeSubscription.latest_invoice as any)?.payment_intent?.client_secret
    });

  } catch (error) {
    console.error('❌ Subscription POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

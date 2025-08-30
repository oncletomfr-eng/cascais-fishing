import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { stripe, calculateCommission, createPaymentWithCommission } from '@/lib/stripe';

// GET /api/payments - получить платежи пользователя  
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // SUBSCRIPTION, TOUR_BOOKING, COURSE_PURCHASE, ADVERTISING
    const status = searchParams.get('status'); // PENDING, SUCCEEDED, FAILED
    const limit = parseInt(searchParams.get('limit') || '50');

    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Фильтры для запроса
    const whereCondition: any = {
      userId: user.id
    };

    if (type) whereCondition.type = type;
    if (status) whereCondition.status = status;

    // Получаем платежи
    const payments = await prisma.payment.findMany({
      where: whereCondition,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        subscription: {
          select: { id: true, tier: true }
        },
        trip: {
          select: { 
            id: true, 
            date: true, 
            pricePerPerson: true,
            description: true 
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return NextResponse.json({ 
      success: true,
      payments,
      total: payments.length
    });

  } catch (error) {
    console.error('❌ Payments GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

// POST /api/payments - создать платеж с комиссией
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      type, // 'TOUR_BOOKING', 'COURSE_PURCHASE', 'ADVERTISING'
      amount, // сумма в центах
      currency = 'eur',
      tripId,
      description,
      connectedAccountId, // для комиссий
      metadata = {}
    } = body;

    // Валидация
    if (!type || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid payment parameters' },
        { status: 400 }
      );
    }

    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          take: 1
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Определяем тип подписки для расчета комиссии
    const subscriptionTier = user.subscriptions[0]?.tier === 'CAPTAIN_PREMIUM' 
      ? 'premium' 
      : 'free';

    // Рассчитываем комиссию для туров
    let commissionAmount: number | undefined;
    let commissionRate: number | undefined;

    if (type === 'TOUR_BOOKING') {
      commissionAmount = calculateCommission(amount, subscriptionTier);
      commissionRate = subscriptionTier === 'premium' ? 0.20 : 0.15;
    }

    // Создаем Payment Intent в Stripe согласно документации
    const paymentIntent = await createPaymentWithCommission(
      amount,
      currency,
      connectedAccountId,
      commissionAmount
    );

    // Сохраняем платеж в базе данных
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        tripId: tripId || undefined,
        stripePaymentId: paymentIntent.id,
        type,
        amount,
        currency: currency.toUpperCase(),
        status: 'PENDING',
        commissionAmount,
        commissionRate,
        description,
        metadata: {
          ...metadata,
          stripe_payment_intent_id: paymentIntent.id,
          subscription_tier: subscriptionTier,
          created_via: 'api'
        }
      }
    });

    console.log('✅ Payment created with commission:', {
      paymentId: payment.id,
      stripePaymentId: paymentIntent.id,
      amount,
      commissionAmount,
      commissionRate,
      type
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        type: payment.type,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        commissionAmount: payment.commissionAmount,
        commissionRate: payment.commissionRate
      },
      clientSecret: paymentIntent.client_secret
    });

  } catch (error) {
    console.error('❌ Payment POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}

// PUT /api/payments/:id - обновить статус платежа (webhook)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, stripePaymentId, status, paidAt } = body;

    // Валидация
    if (!paymentId && !stripePaymentId) {
      return NextResponse.json(
        { error: 'Payment ID required' },
        { status: 400 }
      );
    }

    // Находим платеж
    const whereCondition = paymentId 
      ? { id: paymentId }
      : { stripePaymentId };

    const payment = await prisma.payment.update({
      where: whereCondition,
      data: {
        status: status || 'SUCCEEDED',
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        updatedAt: new Date()
      }
    });

    console.log('✅ Payment status updated:', {
      paymentId: payment.id,
      status: payment.status,
      paidAt: payment.paidAt
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        paidAt: payment.paidAt
      }
    });

  } catch (error) {
    console.error('❌ Payment PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Mail, Calendar, CreditCard } from 'lucide-react';
import Link from 'next/link';

/**
 * Success Page - Stripe Checkout Completion
 * Based on Context7 Stripe documentation and t3dotgg patterns
 * Handles post-checkout success flow with session verification
 */

interface CheckoutSessionData {
  id: string;
  status: string;
  payment_status: string;
  customer_email: string;
  amount_total: number;
  currency: string;
  subscription_id?: string;
  payment_intent_id?: string;
}

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [sessionData, setSessionData] = useState<CheckoutSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID found');
      setLoading(false);
      return;
    }

    // Verify checkout session (Context7 best practice)
    const verifySession = async () => {
      try {
        const response = await fetch(`/api/create-checkout-session?session_id=${sessionId}`);
        const data = await response.json();

        if (data.success) {
          setSessionData(data.session);
        } else {
          setError(data.error || 'Session verification failed');
        }
      } catch (err) {
        console.error('Session verification error:', err);
        setError('Failed to verify payment session');
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [sessionId]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-center text-gray-600">Verifying your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !sessionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Verification Failed</h2>
            <p className="text-gray-600 mb-6">{error || 'Unable to verify your payment'}</p>
            <Button asChild>
              <Link href="/">Return Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Format amount
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  // Success state
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Payment Successful! 🎉
          </CardTitle>
          <CardDescription className="text-lg text-gray-600">
            Thank you for your purchase. Your payment has been processed successfully.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Payment Details */}
          <div className="bg-white rounded-lg p-6 border">
            <h3 className="font-semibold text-lg mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Payment Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Amount Paid</p>
                <p className="font-semibold text-lg">
                  {formatAmount(sessionData.amount_total, sessionData.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Status</p>
                <p className="font-semibold text-green-600 capitalize">
                  {sessionData.payment_status}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Session ID</p>
                <p className="font-mono text-sm text-gray-800">{sessionData.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-sm text-gray-800">{sessionData.customer_email}</p>
              </div>
            </div>
          </div>

          {/* Subscription Success */}
          {sessionData.subscription_id && (
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="font-semibold text-lg mb-2 flex items-center text-blue-800">
                <Calendar className="w-5 h-5 mr-2" />
                Subscription Activated
              </h3>
              <p className="text-blue-700 mb-3">
                Your Captain Premium subscription is now active! You now have access to:
              </p>
              <ul className="list-disc list-inside text-blue-700 space-y-1">
                <li>Priority booking for fishing tours</li>
                <li>Premium filters and recommendations</li>
                <li>Advanced analytics and insights</li>
                <li>Access to certification courses</li>
                <li>20% commission rate (vs 15% standard)</li>
              </ul>
            </div>
          )}

          {/* One-time Payment Success */}
          {sessionData.payment_intent_id && !sessionData.subscription_id && (
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <h3 className="font-semibold text-lg mb-2 flex items-center text-green-800">
                <CheckCircle className="w-5 h-5 mr-2" />
                Booking Confirmed
              </h3>
              <p className="text-green-700">
                Your fishing tour booking has been confirmed! Check your email for detailed information and prepare for an amazing fishing experience.
              </p>
            </div>
          )}

          {/* Email Confirmation */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex items-center text-gray-700">
              <Mail className="w-5 h-5 mr-2" />
              <span className="text-sm">
                A confirmation email has been sent to <strong>{sessionData.customer_email}</strong>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button size="lg" asChild className="flex-1">
              <Link href="/fishing-diary" className="flex items-center justify-center">
                View Your Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            
            {sessionData.subscription_id && (
              <Button variant="outline" size="lg" asChild className="flex-1">
                <Link href="/profiles" className="flex items-center justify-center">
                  Manage Subscription
                </Link>
              </Button>
            )}
          </div>

          {/* Support Information */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              Need help? Contact our support team at{' '}
              <a href="mailto:support@cascaisfishing.com" className="text-blue-600 hover:underline">
                support@cascaisfishing.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

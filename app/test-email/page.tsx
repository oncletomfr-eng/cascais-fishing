'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle, AlertCircle } from 'lucide-react';

export default function TestEmailPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    messageId?: string;
  } | null>(null);

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error occurred while sending test email',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📧 Email System Test
          </h1>
          <p className="text-gray-600">
            Test the Cascais Fishing email integration
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Test Email Delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTestEmail} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  required
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter your email to receive a test booking confirmation
                </p>
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                  <strong>⚠️ Testing Limitation:</strong> In test mode, emails can only be sent to <code>schoolly@gmail.com</code>. 
                  For production use, verify a domain at <a href="https://resend.com/domains" target="_blank" className="underline">resend.com/domains</a>.
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !email}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Test Email...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Test Email
                  </>
                )}
              </Button>
            </form>

            {result && (
              <Alert
                className="mt-4"
                variant={result.success ? "default" : "destructive"}
              >
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <AlertDescription>
                    {result.message}
                    {result.success && result.messageId && (
                      <div className="mt-2 text-sm">
                        <strong>Message ID:</strong> {result.messageId}
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>📋 Email System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>React Email Components:</span>
                <span className="text-green-600 font-medium">✅ Installed</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Resend SDK:</span>
                <span className="text-green-600 font-medium">✅ Installed</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Email Templates:</span>
                <span className="text-green-600 font-medium">✅ Ready</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Server Actions Integration:</span>
                <span className="text-green-600 font-medium">✅ Integrated</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> If you don't have a Resend API key configured,
                the system will run in development mode and log emails to the console.
                Check the browser console or server logs to see the email content.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
            className="mr-2"
          >
            ← Back to Main Site
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open('/EMAIL_SETUP.md', '_blank')}
          >
            📖 Setup Guide
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield } from 'lucide-react'
import { signIn, useSession } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginDebug() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { data: session, status } = useSession()
  const router = useRouter()

  console.log('🎯 Client session:', session, 'status:', status)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    console.log('🔐 Client-side login attempt with password:', password)
    
    try {
      const result = await signIn('credentials', {
        password,
        redirect: false,
      })
      
      console.log('🔑 signIn result:', result)
      
      if (result?.error) {
        setError(result.error === 'CredentialsSignin' ? 'Invalid password' : 'Authentication failed')
      } else if (result?.ok) {
        console.log('✅ Login successful, redirecting...')
        router.push('/admin')
      }
    } catch (err) {
      console.log('❌ Login error:', err)
      setError('Login failed')
    } finally {
      setLoading(false)
    }
  }

  // If already logged in, redirect
  if (status === 'authenticated') {
    console.log('🎉 Already authenticated, redirecting...')
    router.push('/admin')
    return <div>Redirecting...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Access (Debug)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your password to access the admin panel
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                className="mt-1"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
            
            <div className="text-xs text-gray-500 text-center">
              Password: qwerty123
              <br />
              Session status: {status}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

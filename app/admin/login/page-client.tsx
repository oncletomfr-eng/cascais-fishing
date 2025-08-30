'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield } from 'lucide-react'
import { signIn, useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')

  console.log('🔍 AdminLogin - Session status:', status)
  console.log('🔍 AdminLogin - Session data:', session)
  console.log('🔍 AdminLogin - URL Error:', urlError)

  // Handle URL errors
  useEffect(() => {
    if (urlError) {
      switch (urlError) {
        case 'CredentialsSignin':
          setError('Неверный пароль')
          break
        case 'AuthError':
          setError('Ошибка аутентификации')
          break
        default:
          setError('Неизвестная ошибка')
      }
    }
  }, [urlError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    console.log('🚀 SIMPLE LOGIN: Starting with password:', password)
    
    if (!password) {
      console.log('❌ No password provided')
      setError('Введите пароль')
      setLoading(false)
      return
    }
    
    try {
      console.log('📡 Calling signIn function...')
      
      const result = await signIn('credentials', {
        password: password,
        redirect: false
      })
      
      console.log('✅ SignIn completed, result:', result)
      
      if (result?.error) {
        console.log('❌ Authentication failed:', result.error)
        setError('Неверный пароль')
        setLoading(false)
      } else if (result?.ok) {
        console.log('🎉 SUCCESS! Redirecting to admin...')
        // Use window.location for guaranteed redirect
        setTimeout(() => {
          window.location.href = '/admin'
        }, 100)
      } else {
        console.log('⚠️ Unexpected response:', result)
        setError('Неожиданный ответ сервера')
        setLoading(false)
      }
    } catch (error) {
      console.error('💥 Exception during login:', error)
      setError('Ошибка соединения с сервером')
      setLoading(false)
    }
  }

  // Show loading while session is being checked
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Access (Client v5)</CardTitle>
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
                disabled={loading}
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
            
            <div className="text-xs text-gray-500 text-center space-y-1">
              <div>Password: qwerty123</div>
              <div>Session: {status}</div>
              <div>NextAuth v5 Client-Side Solution</div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
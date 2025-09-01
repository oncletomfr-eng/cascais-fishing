import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield } from 'lucide-react'
import { signIn } from '@/auth'
import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'

export default async function AdminLoginServerAction({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const error = resolvedSearchParams.error

  async function authenticate(formData: FormData) {
    "use server"
    
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    console.log('🔐 Server action authenticate called with email:', email, 'password:', password)
    
    try {
      console.log('📡 Attempting signIn with standard NextAuth redirect...')
      await signIn("credentials", {
        email,
        password,
        redirectTo: "/admin",
      })
    } catch (error: any) {
      console.log('❌ Authentication error:', error)
      console.log('🔍 Error type:', error?.type)
      console.log('🔍 Error digest:', error?.digest)
      
      // В NextAuth v5 успешная аутентификация выбрасывает NEXT_REDIRECT
      if (error?.digest?.includes('NEXT_REDIRECT')) {
        console.log('✅ Authentication successful - redirect thrown')
        throw error // Переброс для корректного редиректа
      }
      
      // Обработка ошибок аутентификации
      if (error instanceof AuthError) {
        console.log('🚫 AuthError detected:', error.type)
        switch (error.type) {
          case 'CredentialsSignin':
            redirect('/admin/login?error=CredentialsSignin')
          default:
            redirect('/admin/login?error=AuthError')
        }
      }
      
      // Для других ошибок
      console.log('🔄 Redirecting to login with unknown error')
      redirect('/admin/login?error=UnknownError')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Access (Fixed v2)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your password to access the admin panel
          </p>
        </CardHeader>
        <CardContent>
          <form action={authenticate} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@cascaisfishing.com"
                required
                className="mt-1"
                defaultValue="admin@cascaisfishing.com"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter admin password"
                required
                className="mt-1"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {error === 'CredentialsSignin' && 'Неверный пароль. Попробуйте: qwerty123'}
                  {error === 'AuthError' && 'Ошибка аутентификации. Попробуйте еще раз.'}
                  {error === 'UnknownError' && 'Неизвестная ошибка. Обратитесь к администратору.'}
                  {!['CredentialsSignin', 'AuthError', 'UnknownError'].includes(error) && 'Произошла ошибка входа'}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full">
              Login
            </Button>
            
            <div className="text-xs text-gray-500 text-center">
              <strong>Admin Credentials:</strong>
              <br />
              Email: admin@cascaisfishing.com
              <br />
              Password: qwerty123
              <br />
              <span className="text-gray-400">NextAuth v5 Fixed - v20250131-002000</span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

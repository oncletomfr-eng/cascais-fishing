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
    
    const password = formData.get("password") as string
    console.log('🔐 Server action authenticate called with password:', password)
    
    try {
      console.log('📡 Attempting signIn...')
      const result = await signIn("credentials", {
        password,
        redirect: false
      })
      
      console.log('🔑 SignIn result:', result)
      
      if (result?.error) {
        console.log('❌ Authentication failed:', result.error)
        redirect('/admin/login?error=CredentialsSignin')
      } else {
        console.log('✅ Authentication successful! Redirecting to /admin')
        redirect('/admin')
      }
    } catch (error: any) {
      console.log('❌ Exception during authentication:', error)
      redirect('/admin/login?error=AuthError')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Access (Server Action)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your password to access the admin panel
          </p>
        </CardHeader>
        <CardContent>
          <form action={authenticate} className="space-y-4">
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
                  {error === 'CredentialsSignin' ? 'Неверный пароль' : 'Ошибка аутентификации'}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full">
              Login
            </Button>
            
            <div className="text-xs text-gray-500 text-center">
              Password: qwerty123
              <br />
              NextAuth v5 Server Action Solution
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

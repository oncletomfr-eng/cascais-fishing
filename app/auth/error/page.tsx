/**
 * Authentication Error Page
 * Displays user-friendly error messages for auth failures
 */

'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

const errorMessages: Record<string, { title: string; description: string; action?: string }> = {
  Configuration: {
    title: 'Ошибка конфигурации',
    description: 'Произошла ошибка в настройке сервера. Свяжитесь с поддержкой.',
  },
  AccessDenied: {
    title: 'Доступ запрещен',
    description: 'У вас нет прав для доступа к этому ресурсу.',
  },
  Verification: {
    title: 'Ошибка верификации',
    description: 'Токен верификации недействителен или истек.',
    action: 'Запросите новое письмо для верификации'
  },
  Default: {
    title: 'Ошибка входа',
    description: 'Произошла неизвестная ошибка. Попробуйте снова.',
  },
  CredentialsSignin: {
    title: 'Неверные данные',
    description: 'Проверьте правильность email и пароля.',
  },
  OAuthSignin: {
    title: 'Ошибка OAuth',
    description: 'Не удалось войти через выбранный сервис.',
  },
  OAuthCallback: {
    title: 'Ошибка OAuth callback',
    description: 'Произошла ошибка при обработке ответа от сервиса авторизации.',
  },
  OAuthCreateAccount: {
    title: 'Ошибка создания OAuth аккаунта',
    description: 'Не удалось создать аккаунт через внешний сервис.',
  },
  EmailCreateAccount: {
    title: 'Ошибка создания аккаунта',
    description: 'Не удалось создать аккаунт с указанным email.',
  },
  Callback: {
    title: 'Ошибка callback',
    description: 'Произошла ошибка при возврате от сервиса авторизации.',
  },
  OAuthAccountNotLinked: {
    title: 'Аккаунт не связан',
    description: 'Этот email уже используется с другим методом входа.',
    action: 'Войдите другим способом или используйте другой email'
  },
  EmailSignin: {
    title: 'Ошибка email входа',
    description: 'Не удалось отправить письмо для входа.',
  },
  SessionRequired: {
    title: 'Требуется авторизация',
    description: 'Для доступа к этой странице необходимо войти в систему.',
  }
}

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams?.get('error') || 'Default'
  
  const errorInfo = errorMessages[error] || errorMessages.Default

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">
            {errorInfo.title}
          </CardTitle>
          <CardDescription>
            Код ошибки: {error}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {errorInfo.description}
            </AlertDescription>
          </Alert>

          {errorInfo.action && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertDescription className="text-amber-600">
                💡 {errorInfo.action}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/auth/signin">
                <RefreshCw className="mr-2 h-4 w-4" />
                Попробовать снова
              </Link>
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Вернуться на главную
              </Link>
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Если проблема повторяется, свяжитесь с поддержкой:</p>
            <a 
              href="mailto:support@cascaisfishing.com" 
              className="text-blue-600 hover:underline"
            >
              support@cascaisfishing.com
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}

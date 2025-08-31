'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function TestCollaborativeFiltering() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const runFullProcess = async () => {
    setLoading(true)
    setError('')
    
    try {
      // Запускаем полный процесс collaborative filtering
      const response = await fetch('/api/test-collaborative-filtering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setResult(data)
      } else {
        setError('Ошибка: ' + data.message)
      }
    } catch (err) {
      setError('Ошибка запроса: ' + err)
    } finally {
      setLoading(false)
    }
  }

  const getUserRecommendations = async (userId: string) => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`/api/test-collaborative-filtering?userId=${userId}`)
      const data = await response.json()
      
      if (data.success) {
        setResult(data)
      } else {
        setError('Ошибка: ' + data.message)
      }
    } catch (err) {
      setError('Ошибка запроса: ' + err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">🧠 Тестирование Collaborative Filtering</CardTitle>
          <p className="text-muted-foreground">
            Проверка реальной работы системы рекомендаций с данными из PostgreSQL
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Button onClick={runFullProcess} disabled={loading}>
              {loading ? '⏳ Обработка...' : '🚀 Запустить полный процесс'}
            </Button>
            
            <Button 
              onClick={() => getUserRecommendations('participant-1')} 
              disabled={loading}
              variant="outline"
            >
              👤 Рекомендации для participant-1
            </Button>
            
            <Button 
              onClick={() => getUserRecommendations('participant-2')} 
              disabled={loading}
              variant="outline"
            >
              👤 Рекомендации для participant-2
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Card>
              <CardHeader>
                <CardTitle>📊 Результаты</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Как это работает:</h3>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
              <li>Система анализирует **реальные бронирования** из PostgreSQL</li>
              <li>Строит user-item матрицу взаимодействий</li>
              <li>Вычисляет cosine similarity между пользователями</li>
              <li>Генерирует рекомендации: "Участники похожих поездок также ходили на..."</li>
              <li>Сохраняет рекомендации в базу для быстрого доступа</li>
            </ol>
          </div>

          <div className="mt-4 p-4 bg-green-50 rounded">
            <h3 className="font-semibold text-green-900 mb-2">📈 Реальные данные в БД:</h3>
            <ul className="list-disc list-inside text-sm text-green-800 space-y-1">
              <li><strong>12 пользователей:</strong> admin, captains, participants</li>
              <li><strong>10 поездок:</strong> различные виды рыбалки</li>
              <li><strong>12 подтвержденных бронирований:</strong> CONFIRMED/COMPLETED статус</li>
              <li><strong>Нет моков:</strong> все данные из production PostgreSQL</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

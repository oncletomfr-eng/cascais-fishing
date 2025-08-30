'use client'

import { useState } from 'react'

export default function TestAuth() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testCredentialsAuth = async () => {
    setLoading(true)
    setResult('')
    
    try {
      console.log('🧪 Starting direct API test...')
      
      // Прямой вызов credentials API
      const response = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          password: 'qwerty123',
          callbackUrl: '/admin',
          json: 'true'
        }),
      })

      console.log('📡 Response status:', response.status)
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))
      
      const responseText = await response.text()
      console.log('📄 Response body:', responseText)
      
      setResult(`Status: ${response.status}\n\nHeaders:\n${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}\n\nBody:\n${responseText}`)
      
    } catch (error) {
      console.error('❌ Test error:', error)
      setResult(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testProviders = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/providers')
      const data = await response.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setResult(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testSession = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/session')
      const data = await response.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setResult(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>NextAuth.js API Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={testProviders} disabled={loading} style={{ margin: '5px' }}>
          Test Providers
        </button>
        <button onClick={testSession} disabled={loading} style={{ margin: '5px' }}>
          Test Session
        </button>
        <button onClick={testCredentialsAuth} disabled={loading} style={{ margin: '5px' }}>
          Test Credentials Auth
        </button>
      </div>

      {loading && <p>Loading...</p>}
      
      <div style={{
        background: '#f5f5f5',
        padding: '15px',
        borderRadius: '5px',
        whiteSpace: 'pre-wrap',
        minHeight: '200px',
        border: '1px solid #ddd'
      }}>
        {result || 'Click a button to test...'}
      </div>
    </div>
  )
}

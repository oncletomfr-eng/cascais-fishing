import { auth } from "@/auth"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, User, Mail, Settings } from 'lucide-react'

export default async function AdminDebugPage() {
  const session = await auth()
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Admin Authentication Debug</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Session Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {session ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Authentication Status:</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    ✅ Authenticated
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">User ID:</label>
                    <p className="text-sm bg-gray-100 p-2 rounded font-mono">
                      {session.user.id || 'Not set'}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Role:</label>
                    <p className="text-sm bg-gray-100 p-2 rounded">
                      <Badge variant={session.user.role === 'ADMIN' ? 'default' : 'secondary'}>
                        {session.user.role || 'Not set'}
                      </Badge>
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Name:</label>
                    <p className="text-sm bg-gray-100 p-2 rounded">
                      {session.user.name || 'Not set'}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Email:</label>
                    <p className="text-sm bg-gray-100 p-2 rounded">
                      {session.user.email || 'Not set'}
                    </p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-600">Full Session Object:</label>
                  <pre className="text-xs bg-gray-100 p-3 rounded mt-2 overflow-auto">
                    {JSON.stringify(session, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Badge variant="destructive" className="mb-4">
                  ❌ Not Authenticated
                </Badge>
                <p className="text-gray-600">No active session found</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Debug Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><strong>NextAuth Version:</strong> v5</p>
              <p><strong>Session Strategy:</strong> JWT</p>
              <p><strong>Page Generated:</strong> {new Date().toISOString()}</p>
              <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
              <p><strong>NEXTAUTH_URL:</strong> {process.env.NEXTAUTH_URL}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import { auth } from "@/auth"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, CheckCircle, AlertCircle, User } from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboard() {
  const session = await auth()
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-green-600" />
          <h1 className="text-3xl font-bold text-green-800">🎉 Admin Panel Access Successful!</h1>
        </div>

        <div className="bg-green-100 border border-green-300 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <h2 className="text-lg font-semibold text-green-800">Authentication Working!</h2>
              <p className="text-green-700">
                You have successfully logged in and reached the admin dashboard. 
                NextAuth authentication is functioning correctly.
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Current Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            {session ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">User ID:</label>
                    <p className="text-sm bg-gray-100 p-2 rounded font-mono">
                      {session.user.id}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Role:</label>
                    <div className="mt-1">
                      <Badge variant={session.user.role === 'ADMIN' ? 'default' : 'secondary'}>
                        {session.user.role}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Name:</label>
                    <p className="text-sm bg-gray-100 p-2 rounded">
                      {session.user.name}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email:</label>
                    <p className="text-sm bg-gray-100 p-2 rounded">
                      {session.user.email}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-800">No session found (this shouldn't happen if you can see this page)</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link 
              href="/admin/debug" 
              className="block p-3 bg-blue-50 hover:bg-blue-100 rounded border-l-4 border-blue-400 transition-colors"
            >
              <div className="font-medium text-blue-800">🔍 Debug Authentication</div>
              <div className="text-sm text-blue-600">View detailed session and auth information</div>
            </Link>
            
            <Link 
              href="/api/auth/signout" 
              className="block p-3 bg-red-50 hover:bg-red-100 rounded border-l-4 border-red-400 transition-colors"
            >
              <div className="font-medium text-red-800">🚪 Sign Out</div>
              <div className="text-sm text-red-600">Log out from admin panel</div>
            </Link>
          </CardContent>
        </Card>
        
        <div className="text-center text-sm text-gray-500">
          <p>Page generated: {new Date().toISOString()}</p>
          <p>NextAuth v5 - Middleware temporarily disabled for testing</p>
        </div>
      </div>
    </div>
  )
}

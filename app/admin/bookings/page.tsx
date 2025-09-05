'use client'

import { Suspense } from 'react'
import BookingsTable from '@/components/admin/BookingsTable'
import Badge from '@/components/ui/badge'

export default function BookingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Bookings Management</h1>
        <Badge variant="outline" className="text-sm">
          Live Data
        </Badge>
      </div>

      <Suspense fallback={<div className="h-96 bg-gray-100 rounded-lg animate-pulse" />}>
        <BookingsTable />
      </Suspense>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Calendar, 
  Clock, 
  Users, 
  Phone, 
  Mail, 
  Euro, 
  MessageSquare,
  MoreVertical,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { BookingStatus } from '@prisma/client'

type BookingData = {
  id: string
  type: 'private' | 'group'
  status: BookingStatus
  date: Date
  timeSlot: string
  participants: number
  contactName: string
  contactPhone: string
  contactEmail: string | null
  totalPrice: number
  specialRequests: string | null
  createdAt: Date
  tripDetails: {
    tripId: string
    tripStatus: string
    maxParticipants: number
    minRequired: number
    pricePerPerson: number
  } | null
}

interface BookingDetailsModalProps {
  booking: BookingData
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: (bookingId: string, bookingType: 'private' | 'group', newStatus: BookingStatus) => Promise<void>
}

const StatusBadge = ({ status }: { status: BookingStatus }) => {
  const variants = {
    [BookingStatus.PENDING]: { variant: 'secondary' as const, label: 'Pending' },
    [BookingStatus.CONFIRMED]: { variant: 'default' as const, label: 'Confirmed' },
    [BookingStatus.CANCELLED]: { variant: 'destructive' as const, label: 'Cancelled' },
    [BookingStatus.COMPLETED]: { variant: 'outline' as const, label: 'Completed' },
  }

  const config = variants[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function BookingDetailsModal({ 
  booking, 
  open, 
  onOpenChange, 
  onStatusChange 
}: BookingDetailsModalProps) {
  const [updating, setUpdating] = useState(false)

  const handleStatusChange = async (newStatus: BookingStatus) => {
    setUpdating(true)
    try {
      await onStatusChange(booking.id, booking.type, newStatus)
      onOpenChange(false)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              Booking Details
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {booking.type}
              </Badge>
              <StatusBadge status={booking.status} />
              
              {/* Action Menu */}
              {booking.status === BookingStatus.PENDING && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={updating}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(BookingStatus.CONFIRMED)}
                      className="text-green-600"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirm
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(BookingStatus.CANCELLED)}
                      className="text-red-600"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-mono">
            ID: {booking.id}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Trip Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Trip Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Date</div>
                  <div className="font-medium">
                    {format(new Date(booking.date), 'EEEE, MMMM dd, yyyy')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Time</div>
                  <div className="font-medium flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {booking.timeSlot === 'MORNING_9AM' ? '09:00 AM' : '14:00 PM'}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Participants</div>
                  <div className="font-medium flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {booking.participants} {booking.participants === 1 ? 'person' : 'people'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Price</div>
                  <div className="font-medium flex items-center gap-1 text-green-600">
                    <Euro className="h-4 w-4" />
                    {booking.totalPrice}
                  </div>
                </div>
              </div>

              {booking.type === 'group' && booking.tripDetails && (
                <div className="pt-3 border-t">
                  <div className="text-sm text-muted-foreground mb-2">Group Trip Details</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Trip ID:</span>
                      <div className="font-mono">{booking.tripDetails.tripId.slice(-8)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Trip Status:</span>
                      <div className="capitalize">{booking.tripDetails.tripStatus}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Capacity:</span>
                      <div>{booking.tripDetails.maxParticipants} max</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Min Required:</span>
                      <div>{booking.tripDetails.minRequired} people</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Price per person:</span>
                      <div>€{booking.tripDetails.pricePerPerson}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Name</div>
                <div className="font-medium">{booking.contactName}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Phone</div>
                  <div className="font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <a 
                      href={`tel:${booking.contactPhone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {booking.contactPhone}
                    </a>
                  </div>
                </div>
                
                {booking.contactEmail && (
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <a 
                        href={`mailto:${booking.contactEmail}`}
                        className="text-blue-600 hover:underline"
                      >
                        {booking.contactEmail}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {booking.specialRequests && (
                <div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    Special Requests
                  </div>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm">
                    {booking.specialRequests}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booking Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Booking Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Created</div>
                  <div className="font-medium">
                    {format(new Date(booking.createdAt), 'PPP pp')}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Booking ID</div>
                  <div className="font-mono text-xs">{booking.id}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}

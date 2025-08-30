'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { format } from 'date-fns'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { getAllBookings, updateBookingStatus } from '@/app/actions/admin'
import { BookingStatus } from '@prisma/client'
import { useToast } from '@/hooks/use-toast'
import { BookingDetailsModal } from './BookingDetailsModal'
import { BookingsFilters, type BookingFilters } from './BookingsFilters'

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

// Status badge components
const StatusBadge = ({ status }: { status: BookingStatus }) => {
  const variants = {
    [BookingStatus.PENDING]: { variant: 'secondary' as const, label: 'Pending', icon: Clock },
    [BookingStatus.CONFIRMED]: { variant: 'default' as const, label: 'Confirmed', icon: CheckCircle },
    [BookingStatus.CANCELLED]: { variant: 'destructive' as const, label: 'Cancelled', icon: XCircle },
    [BookingStatus.COMPLETED]: { variant: 'outline' as const, label: 'Completed', icon: CheckCircle },
  }

  const config = variants[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

export function BookingsTable() {
  const [data, setData] = useState<BookingData[]>([])
  const [filteredData, setFilteredData] = useState<BookingData[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<BookingFilters>({})
  const { toast } = useToast()

  // Define columns
  const columns: ColumnDef<BookingData>[] = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <div className="font-mono text-xs">
          {row.getValue<string>('id').slice(-8)}
        </div>
      ),
      size: 80,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.getValue<string>('type')}
        </Badge>
      ),
      size: 80,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <StatusBadge status={row.getValue<BookingStatus>('status')} />,
      size: 120,
    },
    {
      accessorKey: 'date',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue<Date>('date')
        return (
          <div className="text-sm">
            {format(new Date(date), 'MMM dd, yyyy')}
          </div>
        )
      },
      size: 100,
    },
    {
      accessorKey: 'timeSlot',
      header: 'Time',
      cell: ({ row }) => {
        const timeSlot = row.getValue<string>('timeSlot')
        return (
          <div className="text-sm font-mono">
            {timeSlot === 'MORNING_9AM' ? '09:00' : '14:00'}
          </div>
        )
      },
      size: 70,
    },
    {
      accessorKey: 'contactName',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue<string>('contactName')}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.contactPhone}
          </div>
        </div>
      ),
      size: 150,
    },
    {
      accessorKey: 'participants',
      header: 'Participants',
      cell: ({ row }) => (
        <div className="text-center font-medium">
          {row.getValue<number>('participants')}
        </div>
      ),
      size: 80,
    },
    {
      accessorKey: 'totalPrice',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">
          €{row.getValue<number>('totalPrice')}
        </div>
      ),
      size: 80,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const createdAt = row.getValue<Date>('createdAt')
        return (
          <div className="text-xs text-muted-foreground">
            {format(new Date(createdAt), 'MMM dd, HH:mm')}
          </div>
        )
      },
      size: 100,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const booking = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedBooking(booking)
                  setDetailsOpen(true)
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {booking.status === BookingStatus.PENDING && (
                <>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange(booking.id, booking.type, BookingStatus.CONFIRMED)}
                    className="text-green-600"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirm
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange(booking.id, booking.type, BookingStatus.CANCELLED)}
                    className="text-red-600"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel
                  </DropdownMenuItem>
                </>
              )}
              {booking.status === BookingStatus.CONFIRMED && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange(booking.id, booking.type, BookingStatus.COMPLETED)}
                  className="text-blue-600"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark Completed
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      size: 50,
    },
  ], [])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    initialState: {
      sorting: [{ id: 'createdAt', desc: true }],
      pagination: { pageSize: 20 },
    },
  })

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const bookings = await getAllBookings(activeFilters)
        setData(bookings)
        setFilteredData(bookings)
      } catch (error) {
        console.error('Failed to load bookings:', error)
        toast({
          title: "Error",
          description: "Failed to load bookings",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [toast, activeFilters])

  // Handle client-side filtering
  useEffect(() => {
    let filtered = [...data]

    // Search filter
    if (activeFilters.search) {
      const searchTerm = activeFilters.search.toLowerCase()
      filtered = filtered.filter(booking =>
        booking.contactName.toLowerCase().includes(searchTerm) ||
        booking.contactPhone.toLowerCase().includes(searchTerm) ||
        booking.contactEmail?.toLowerCase().includes(searchTerm)
      )
    }

    setFilteredData(filtered)
  }, [data, activeFilters])

  // Handle filters change
  const handleFiltersChange = (filters: BookingFilters) => {
    setActiveFilters(filters)
  }

  // Handle status change
  const handleStatusChange = async (
    bookingId: string, 
    bookingType: 'private' | 'group', 
    newStatus: BookingStatus
  ) => {
    try {
      const result = await updateBookingStatus(bookingId, bookingType, newStatus)
      
      if (result.success) {
        // Update local data
        setData(prev => 
          prev.map(booking => 
            booking.id === bookingId 
              ? { ...booking, status: newStatus }
              : booking
          )
        )
        
        toast({
          title: "Status Updated",
          description: result.message,
        })
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Status update failed:', error)
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <BookingsFilters onFiltersChange={handleFiltersChange} />

      {/* Table */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id}
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-gray-50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{' '}
          of {table.getFilteredRowModel().rows.length} entries
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Details Modal */}
      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}

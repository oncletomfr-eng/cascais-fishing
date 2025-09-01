'use client';

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Alert,
  Chip,
  Avatar,
  Stack,
  Divider,
} from '@mui/material';
import {
  GridColDef,
  GridRowModel,
  GridValueGetter,
  GridRenderCellParams,
  GridRowId,
  GridDensity,
  GridPaginationModel,
  GridSortModel,
  GridFilterModel,
} from '@mui/x-data-grid-pro';
import { EnhancedDataGrid, StatusChip } from '@/components/design-system/EnhancedDataGrid';
import { EnhancedThemeProvider } from '@/components/design-system/EnhancedThemeProvider';
import { useServerDataSource, createMockFetcher, useClientData } from '@/lib/design-system/dataGridHooks';
import { 
  User, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  DollarSign,
  Star,
  Anchor,
  Fish,
  RefreshCw,
  Database,
  Users,
  TrendingUp,
} from 'lucide-react';

// Sample Data Types
interface FishingTrip extends GridRowModel {
  id: number;
  title: string;
  captain: string;
  participantCount: number;
  maxParticipants: number;
  price: number;
  date: string;
  location: string;
  status: 'active' | 'completed' | 'cancelled' | 'pending';
  rating: number;
  duration: number;
  species: string[];
  weather: 'sunny' | 'cloudy' | 'rainy' | 'windy';
  bookingCount: number;
  revenue: number;
}

interface Customer extends GridRowModel {
  id: number;
  name: string;
  email: string;
  phone: string;
  totalBookings: number;
  totalSpent: number;
  lastBooking: string;
  status: 'active' | 'inactive';
  rating: number;
  preferredTrips: string[];
  joinDate: string;
  country: string;
}

// Mock Data Generation
const generateMockTrips = (count: number): FishingTrip[] => {
  const captains = ['Captain João', 'Captain Maria', 'Captain Pedro', 'Captain Ana', 'Captain Carlos'];
  const locations = ['Cascais Bay', 'Atlantic Deep', 'Sintra Coast', 'Estoril Waters', 'Cabo da Roca'];
  const species = ['Tuna', 'Sardine', 'Bass', 'Mackerel', 'Grouper', 'Swordfish'];
  const statuses: FishingTrip['status'][] = ['active', 'completed', 'cancelled', 'pending'];
  const weather: FishingTrip['weather'][] = ['sunny', 'cloudy', 'rainy', 'windy'];

  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    const participantCount = Math.floor(Math.random() * 6) + 1;
    const maxParticipants = 6;
    const price = Math.floor(Math.random() * 200) + 50;
    const bookingCount = Math.floor(Math.random() * 20);
    
    return {
      id,
      title: `Atlantic Fishing Adventure #${id}`,
      captain: captains[Math.floor(Math.random() * captains.length)],
      participantCount,
      maxParticipants,
      price,
      date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      location: locations[Math.floor(Math.random() * locations.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0 - 5.0
      duration: Math.floor(Math.random() * 4) + 3, // 3-6 hours
      species: species.slice(0, Math.floor(Math.random() * 3) + 1),
      weather: weather[Math.floor(Math.random() * weather.length)],
      bookingCount,
      revenue: bookingCount * price,
    };
  });
};

const generateMockCustomers = (count: number): Customer[] => {
  const names = ['João Silva', 'Maria Santos', 'Pedro Costa', 'Ana Oliveira', 'Carlos Pereira', 'Sofia Rodrigues', 'Miguel Ferreira', 'Isabel Martins'];
  const countries = ['Portugal', 'Spain', 'France', 'Germany', 'UK', 'Netherlands', 'Italy', 'USA'];
  const tripTypes = ['Deep Sea', 'Shore', 'Sport', 'Charter', 'Group'];

  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    const name = names[Math.floor(Math.random() * names.length)];
    const totalBookings = Math.floor(Math.random() * 15) + 1;
    const avgPrice = 95;
    
    return {
      id,
      name,
      email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
      phone: `+351 9${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      totalBookings,
      totalSpent: totalBookings * avgPrice + Math.floor(Math.random() * 200),
      lastBooking: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      status: Math.random() > 0.2 ? 'active' : 'inactive' as const,
      rating: Math.round((Math.random() * 2 + 3) * 10) / 10,
      preferredTrips: tripTypes.slice(0, Math.floor(Math.random() * 2) + 1),
      joinDate: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
      country: countries[Math.floor(Math.random() * countries.length)],
    };
  });
};

// Mock data
const mockTrips = generateMockTrips(150);
const mockCustomers = generateMockCustomers(200);

// Column Definitions
const tripColumns: GridColDef<FishingTrip>[] = [
  {
    field: 'id',
    headerName: 'ID',
    width: 70,
    type: 'number',
  },
  {
    field: 'title',
    headerName: 'Trip Title',
    width: 250,
    renderCell: (params: GridRenderCellParams<FishingTrip>) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Fish size={16} />
        <Typography variant="body2" noWrap>
          {params.value}
        </Typography>
      </Box>
    ),
  },
  {
    field: 'captain',
    headerName: 'Captain',
    width: 150,
    renderCell: (params: GridRenderCellParams<FishingTrip>) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Anchor size={14} />
        <Typography variant="body2">{params.value}</Typography>
      </Box>
    ),
  },
  {
    field: 'participants',
    headerName: 'Participants',
    width: 120,
    valueGetter: (value, row) => `${row.participantCount}/${row.maxParticipants}`,
    renderCell: (params: GridRenderCellParams<FishingTrip>) => (
      <Chip
        label={params.value}
        size="small"
        color={params.row.participantCount === params.row.maxParticipants ? 'error' : 'success'}
        variant="outlined"
      />
    ),
  },
  {
    field: 'price',
    headerName: 'Price',
    width: 100,
    type: 'number',
    renderCell: (params: GridRenderCellParams<FishingTrip>) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
        <DollarSign size={14} />
        €{params.value}
      </Box>
    ),
  },
  {
    field: 'date',
    headerName: 'Date',
    width: 120,
    type: 'date',
    valueGetter: (value) => new Date(value),
    renderCell: (params: GridRenderCellParams<FishingTrip>) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Calendar size={14} />
        <Typography variant="body2">
          {new Date(params.row.date).toLocaleDateString('pt-PT')}
        </Typography>
      </Box>
    ),
  },
  {
    field: 'location',
    headerName: 'Location',
    width: 150,
    renderCell: (params: GridRenderCellParams<FishingTrip>) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <MapPin size={14} />
        <Typography variant="body2">{params.value}</Typography>
      </Box>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 120,
    renderCell: (params: GridRenderCellParams<FishingTrip>) => (
      <StatusChip status={params.value} />
    ),
  },
  {
    field: 'rating',
    headerName: 'Rating',
    width: 100,
    type: 'number',
    renderCell: (params: GridRenderCellParams<FishingTrip>) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Star size={14} fill="currentColor" />
        <Typography variant="body2">{params.value}</Typography>
      </Box>
    ),
  },
  {
    field: 'revenue',
    headerName: 'Revenue',
    width: 120,
    type: 'number',
    renderCell: (params: GridRenderCellParams<FishingTrip>) => (
      <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
        €{params.value}
      </Typography>
    ),
  },
];

const customerColumns: GridColDef<Customer>[] = [
  {
    field: 'id',
    headerName: 'ID',
    width: 70,
    type: 'number',
  },
  {
    field: 'name',
    headerName: 'Customer',
    width: 200,
    renderCell: (params: GridRenderCellParams<Customer>) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
          {params.value.split(' ').map((n: string) => n[0]).join('')}
        </Avatar>
        <Typography variant="body2">{params.value}</Typography>
      </Box>
    ),
  },
  {
    field: 'email',
    headerName: 'Email',
    width: 200,
    renderCell: (params: GridRenderCellParams<Customer>) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Mail size={14} />
        <Typography variant="body2" noWrap>{params.value}</Typography>
      </Box>
    ),
  },
  {
    field: 'phone',
    headerName: 'Phone',
    width: 150,
    renderCell: (params: GridRenderCellParams<Customer>) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Phone size={14} />
        <Typography variant="body2">{params.value}</Typography>
      </Box>
    ),
  },
  {
    field: 'totalBookings',
    headerName: 'Bookings',
    width: 100,
    type: 'number',
    renderCell: (params: GridRenderCellParams<Customer>) => (
      <Chip label={params.value} size="small" color="primary" variant="outlined" />
    ),
  },
  {
    field: 'totalSpent',
    headerName: 'Total Spent',
    width: 120,
    type: 'number',
    renderCell: (params: GridRenderCellParams<Customer>) => (
      <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
        €{params.value}
      </Typography>
    ),
  },
  {
    field: 'lastBooking',
    headerName: 'Last Booking',
    width: 120,
    type: 'date',
    valueGetter: (value) => new Date(value),
    renderCell: (params: GridRenderCellParams<Customer>) => (
      <Typography variant="body2">
        {new Date(params.row.lastBooking).toLocaleDateString('pt-PT')}
      </Typography>
    ),
  },
  {
    field: 'status',
    headerName: 'Status',
    width: 100,
    renderCell: (params: GridRenderCellParams<Customer>) => (
      <StatusChip status={params.value} />
    ),
  },
  {
    field: 'country',
    headerName: 'Country',
    width: 120,
    renderCell: (params: GridRenderCellParams<Customer>) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <MapPin size={14} />
        <Typography variant="body2">{params.value}</Typography>
      </Box>
    ),
  },
];

// Main Component
export default function DataGridDemo() {
  // UI State
  const [activeTab, setActiveTab] = React.useState<'trips' | 'customers'>('trips');
  const [useServerMode, setUseServerMode] = React.useState(true);
  const [density, setDensity] = React.useState<GridDensity>('standard');
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Mock data sources
  const tripsFetcher = createMockFetcher(mockTrips, 800);
  const customersFetcher = createMockFetcher(mockCustomers, 600);

  // Server data sources
  const tripsDataSource = useServerDataSource({
    fetcher: tripsFetcher,
    onError: (error) => {
      console.error('Trips data fetch error:', error);
    },
    onSuccess: (data) => {
      console.log('Trips data fetched:', data.total, 'records');
    },
  });

  const customersDataSource = useServerDataSource({
    fetcher: customersFetcher,
    onError: (error) => {
      console.error('Customers data fetch error:', error);
    },
    onSuccess: (data) => {
      console.log('Customers data fetched:', data.total, 'records');
    },
  });

  // Client data hooks
  const tripsClientData = useClientData({
    data: mockTrips,
    defaultPageSize: 25,
  });

  const customersClientData = useClientData({
    data: mockCustomers,
    defaultPageSize: 25,
  });

  // Handlers
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleRowClick = (params: any) => {
    console.log('Row clicked:', params.row);
  };

  const handleRowDoubleClick = (params: any) => {
    console.log('Row double-clicked:', params.row);
  };

  return (
    <EnhancedThemeProvider>
      <Container maxWidth={false} sx={{ py: 4, px: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ 
            fontWeight: 700,
            background: 'linear-gradient(45deg, #1E40AF, #EA580C)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            🚀 Enhanced DataGrid Demo
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
            Advanced DataGrid with Server-side Operations, Export, and Cascais Fishing Design System Integration
          </Typography>

          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Fish size={24} style={{ color: '#1E40AF', marginBottom: 8 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1E40AF' }}>
                  {mockTrips.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fishing Trips
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Users size={24} style={{ color: '#EA580C', marginBottom: 8 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#EA580C' }}>
                  {mockCustomers.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Customers
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <TrendingUp size={24} style={{ color: '#10B981', marginBottom: 8 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#10B981' }}>
                  €{mockTrips.reduce((sum, trip) => sum + trip.revenue, 0).toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Revenue
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Database size={24} style={{ color: '#8B5CF6', marginBottom: 8 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#8B5CF6' }}>
                  {useServerMode ? 'Server' : 'Client'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Data Mode
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Controls */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              🎛️ Demo Controls
            </Typography>
            <Stack direction="row" spacing={3} flexWrap="wrap" alignItems="center">
              <FormControlLabel
                control={
                  <Switch
                    checked={useServerMode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUseServerMode(e.target.checked)}
                  />
                }
                label="Server-side Mode"
              />
              
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Data Type</InputLabel>
                <Select
                  value={activeTab}
                  label="Data Type"
                  onChange={(e: any) => setActiveTab(e.target.value as 'trips' | 'customers')}
                >
                  <MenuItem value="trips">Fishing Trips</MenuItem>
                  <MenuItem value="customers">Customers</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Density</InputLabel>
                <Select
                  value={density}
                  label="Density"
                  onChange={(e: any) => setDensity(e.target.value as GridDensity)}
                >
                  <MenuItem value="compact">Compact</MenuItem>
                  <MenuItem value="standard">Standard</MenuItem>
                  <MenuItem value="comfortable">Comfortable</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                startIcon={<RefreshCw size={16} />}
                onClick={handleRefresh}
              >
                Refresh Data
              </Button>
            </Stack>
          </Paper>

          {/* Info Alert */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Features Demo:</strong> Server-side pagination, sorting, filtering • 
              CSV/Excel export • Multi-column operations • Quick search • 
              Row selection • Custom toolbar • Design system integration • 
              Performance optimization for large datasets
            </Typography>
          </Alert>
        </Box>

        {/* DataGrid */}
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          {activeTab === 'trips' ? (
            <EnhancedDataGrid
              key={`trips-${useServerMode}-${refreshKey}`}
              title="🎣 Fishing Trips Management"
              subtitle="Manage all fishing trip bookings, schedules, and analytics"
              columns={tripColumns}
              {...(useServerMode 
                ? { dataSource: tripsDataSource }
                : tripsClientData
              )}
              height={700}
              checkboxSelection
              density={density}
              onDensityChange={setDensity}
              onRefresh={handleRefresh}
              onRowClick={handleRowClick}
              onRowDoubleClick={handleRowDoubleClick}
              csvOptions={{
                fileName: 'cascais-fishing-trips',
                delimiter: ';',
                utf8WithBom: true,
              }}
              excelOptions={{
                fileName: 'cascais-fishing-trips.xlsx',
              }}
              customToolbarActions={
                <Chip 
                  label={`Mode: ${useServerMode ? 'Server' : 'Client'}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              }
              pageSizeOptions={[10, 25, 50, 100]}
              keepNonExistentRowsSelected
            />
          ) : (
            <EnhancedDataGrid
              key={`customers-${useServerMode}-${refreshKey}`}
              title="👥 Customer Management"
              subtitle="Track customer bookings, preferences, and engagement analytics"
              columns={customerColumns}
              {...(useServerMode 
                ? { dataSource: customersDataSource }
                : customersClientData
              )}
              height={700}
              checkboxSelection
              density={density}
              onDensityChange={setDensity}
              onRefresh={handleRefresh}
              onRowClick={handleRowClick}
              onRowDoubleClick={handleRowDoubleClick}
              csvOptions={{
                fileName: 'cascais-fishing-customers',
                delimiter: ';',
                utf8WithBom: true,
              }}
              excelOptions={{
                fileName: 'cascais-fishing-customers.xlsx',
              }}
              customToolbarActions={
                <Chip 
                  label={`Mode: ${useServerMode ? 'Server' : 'Client'}`}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              }
              pageSizeOptions={[10, 25, 50, 100, 200]}
              keepNonExistentRowsSelected
            />
          )}
        </Paper>

        {/* Feature Highlights */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            ⚡ Features Implemented
          </Typography>
          <Grid container spacing={2}>
            {[
              'Server-side Pagination with DataSource pattern',
              'Multi-column Sorting with custom comparators',
              'Advanced Filtering with operators',
              'CSV/Excel Export with custom options',
              'Quick Search with debounced input',
              'Row Selection with persistent state',
              'Custom Toolbar with enhanced controls',
              'Design System Integration',
              'Performance Optimization',
              'Mobile Responsive Design',
              'Accessibility Features',
              'TypeScript Support'
            ].map((feature, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    bgcolor: 'success.main' 
                  }} />
                  <Typography variant="body2">{feature}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </EnhancedThemeProvider>
  );
}

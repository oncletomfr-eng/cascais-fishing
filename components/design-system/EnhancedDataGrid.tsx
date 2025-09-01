'use client';

import React from 'react';
import { 
  DataGrid,
  GridColDef,
  GridPaginationModel,
  GridSortModel,
  GridFilterModel,
  GridRowSelectionModel,
  GridDataSource,
  GridGetRowsParams,
  GridGetRowsResponse,
  GridRowIdGetter,
  GridToolbar,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarExport,
  GridToolbarDensitySelector,
  GridToolbarQuickFilter,
  GridCsvExportOptions,
  GridExcelExportOptions,
  GridPrintExportOptions,
  GridRowModel,
  GridRowId,
  GridValidRowModel,
  GridValueGetter,
  GridRowsProp,
  GridRenderCellParams,
  GridColumnVisibilityModel,
  GridDensity,
  gridClasses
} from '@mui/x-data-grid';
import { Box, Typography, IconButton, Chip } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import { RefreshCw, Filter, Download, Settings, Eye, BarChart3 } from 'lucide-react';
import { useDesignSystem } from '@/lib/design-system';

// Enhanced Theme Integration
const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  // Main Container Styling
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  
  // Header Styling
  [`& .${gridClasses.columnHeaders}`]: {
    backgroundColor: theme.palette.mode === 'dark' 
      ? 'rgba(55, 125, 255, 0.05)' 
      : 'rgba(30, 64, 175, 0.05)',
    borderBottom: `2px solid ${theme.palette.primary.main}`,
    color: theme.palette.primary.main,
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  
  // Column Header Hover
  [`& .${gridClasses.columnHeader}:hover`]: {
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(55, 125, 255, 0.1)'
      : 'rgba(30, 64, 175, 0.08)',
  },
  
  // Row Styling
  [`& .${gridClasses.row}`]: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.04)'
        : 'rgba(0, 0, 0, 0.02)',
    },
    '&.Mui-selected': {
      backgroundColor: theme.palette.mode === 'dark'
        ? 'rgba(30, 64, 175, 0.1)'
        : 'rgba(30, 64, 175, 0.08)',
      '&:hover': {
        backgroundColor: theme.palette.mode === 'dark'
          ? 'rgba(30, 64, 175, 0.15)'
          : 'rgba(30, 64, 175, 0.12)',
      },
    },
  },
  
  // Cell Styling
  [`& .${gridClasses.cell}`]: {
    color: theme.palette.text.primary,
    fontSize: '0.875rem',
    padding: theme.spacing(1, 2),
    display: 'flex',
    alignItems: 'center',
  },
  
  // Footer Styling
  [`& .${gridClasses.footerContainer}`]: {
    backgroundColor: theme.palette.mode === 'dark'
      ? theme.palette.grey[900]
      : theme.palette.grey[50],
    borderTop: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.secondary,
  },
  
  // Toolbar Styling
  [`& .${gridClasses.toolbarContainer}`]: {
    padding: theme.spacing(1.5, 2),
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  
  // Loading Overlay
  [`& .${gridClasses.overlayWrapper}`]: {
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(0, 0, 0, 0.8)'
      : 'rgba(255, 255, 255, 0.8)',
  },
}));

// Custom Toolbar with Enhanced Features
interface EnhancedToolbarProps {
  onRefresh?: () => void;
  showQuickFilter?: boolean;
  csvOptions?: GridCsvExportOptions;
  excelOptions?: GridExcelExportOptions;
  printOptions?: GridPrintExportOptions;
  customActions?: React.ReactNode;
}

const EnhancedToolbar: React.FC<EnhancedToolbarProps> = ({
  onRefresh,
  showQuickFilter = true,
  csvOptions,
  excelOptions,
  printOptions,
  customActions
}) => {
  const theme = useTheme();

  return (
    <GridToolbarContainer
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1,
        p: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {onRefresh && (
          <IconButton
            size="small"
            onClick={onRefresh}
            sx={{
              color: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: 'rgba(30, 64, 175, 0.1)',
              },
            }}
          >
            <RefreshCw size={18} />
          </IconButton>
        )}
        
        <GridToolbarColumnsButton />
        <GridToolbarFilterButton />
        <GridToolbarDensitySelector />
        <GridToolbarExport 
          csvOptions={{
            fileName: 'cascais-fishing-data',
            delimiter: ',',
            utf8WithBom: true,
            ...csvOptions
          }}
          printOptions={{
            hideFooter: true,
            hideToolbar: true,
            ...printOptions
          }}
          excelOptions={{
            fileName: 'cascais-fishing-data.xlsx',
            ...excelOptions
          }}
        />
        
        {customActions}
      </Box>
      
      {showQuickFilter && (
        <GridToolbarQuickFilter
          quickFilterParser={(searchInput) => 
            searchInput.split(',').map((value) => value.trim())
          }
          quickFilterFormatter={(quickFilterValues) => 
            quickFilterValues.join(', ')
          }
          debounceMs={300}
          sx={{ 
            maxWidth: 400,
            '& .MuiOutlinedInput-root': {
              borderRadius: theme.shape.borderRadius,
            }
          }}
        />
      )}
    </GridToolbarContainer>
  );
};

// Enhanced Status Chip Component
interface StatusChipProps {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled';
  label?: string;
}

const StatusChip: React.FC<StatusChipProps> = ({ status, label }) => {
  const getStatusProps = () => {
    switch (status) {
      case 'active':
        return { color: 'success' as const, label: label || 'Active' };
      case 'inactive':
        return { color: 'default' as const, label: label || 'Inactive' };
      case 'pending':
        return { color: 'warning' as const, label: label || 'Pending' };
      case 'completed':
        return { color: 'success' as const, label: label || 'Completed' };
      case 'cancelled':
        return { color: 'error' as const, label: label || 'Cancelled' };
      default:
        return { color: 'default' as const, label: label || 'Unknown' };
    }
  };

  const props = getStatusProps();
  
  return (
    <Chip
      label={props.label}
      color={props.color}
      variant="outlined"
      size="small"
      sx={{ 
        minWidth: 80,
        fontWeight: 500,
        fontSize: '0.75rem'
      }}
    />
  );
};

// Main Enhanced DataGrid Props
export interface EnhancedDataGridProps<T extends GridValidRowModel = GridRowModel> {
  // Core Props
  columns: GridColDef<T>[];
  rows?: GridRowsProp<T>;
  
  // Server-side Data
  dataSource?: GridDataSource<T>;
  
  // State Management
  paginationModel?: GridPaginationModel;
  onPaginationModelChange?: (model: GridPaginationModel) => void;
  sortModel?: GridSortModel;
  onSortModelChange?: (model: GridSortModel) => void;
  filterModel?: GridFilterModel;
  onFilterModelChange?: (model: GridFilterModel) => void;
  rowSelectionModel?: GridRowSelectionModel;
  onRowSelectionModelChange?: (selectionModel: GridRowSelectionModel) => void;
  columnVisibilityModel?: GridColumnVisibilityModel;
  onColumnVisibilityModelChange?: (model: GridColumnVisibilityModel) => void;
  density?: GridDensity;
  onDensityChange?: (density: GridDensity) => void;
  
  // Row Management
  rowCount?: number;
  rowCountMode?: 'client' | 'server' | 'serverEstimated';
  getRowId?: GridRowIdGetter<T>;
  getRowHeight?: number | ((params: { id: GridRowId; model: GridRowModel }) => number);
  
  // Loading States
  loading?: boolean;
  
  // Selection
  checkboxSelection?: boolean;
  disableRowSelectionOnClick?: boolean;
  keepNonExistentRowsSelected?: boolean;
  
  // Toolbar
  showToolbar?: boolean;
  showQuickFilter?: boolean;
  onRefresh?: () => void;
  customToolbarActions?: React.ReactNode;
  
  // Export Options
  csvOptions?: GridCsvExportOptions;
  excelOptions?: GridExcelExportOptions;
  printOptions?: GridPrintExportOptions;
  
  // UI Customization
  title?: string;
  subtitle?: string;
  height?: number;
  autoHeight?: boolean;
  
  // Advanced Features
  pagination?: boolean;
  pageSizeOptions?: number[];
  sortingMode?: 'client' | 'server';
  filterMode?: 'client' | 'server';
  paginationMode?: 'client' | 'server';
  
  // Event Handlers
  onRowClick?: (params: any) => void;
  onRowDoubleClick?: (params: any) => void;
  onCellClick?: (params: GridRenderCellParams<T>) => void;
  
  // Styling
  sx?: any;
}

// Main Enhanced DataGrid Component
export const EnhancedDataGrid = <T extends GridValidRowModel = GridRowModel>({
  columns,
  rows,
  dataSource,
  
  // State
  paginationModel,
  onPaginationModelChange,
  sortModel,
  onSortModelChange,
  filterModel,
  onFilterModelChange,
  rowSelectionModel,
  onRowSelectionModelChange,
  columnVisibilityModel,
  onColumnVisibilityModelChange,
  density = 'standard',
  onDensityChange,
  
  // Row Management
  rowCount,
  rowCountMode = 'server',
  getRowId,
  getRowHeight,
  
  // Loading
  loading = false,
  
  // Selection
  checkboxSelection = false,
  disableRowSelectionOnClick = false,
  keepNonExistentRowsSelected = true,
  
  // Toolbar
  showToolbar = true,
  showQuickFilter = true,
  onRefresh,
  customToolbarActions,
  
  // Export
  csvOptions,
  excelOptions,
  printOptions,
  
  // UI
  title,
  subtitle,
  height = 600,
  autoHeight = false,
  
  // Server-side
  pagination = true,
  pageSizeOptions = [25, 50, 100, 200],
  sortingMode = dataSource ? 'server' : 'client',
  filterMode = dataSource ? 'server' : 'client',
  paginationMode = dataSource ? 'server' : 'client',
  
  // Events
  onRowClick,
  onRowDoubleClick,
  onCellClick,
  
  // Styling
  sx,
  
  ...otherProps
}: EnhancedDataGridProps<T>) => {
  const { theme } = useDesignSystem();
  
  // Default pagination model
  const [internalPaginationModel, setInternalPaginationModel] = React.useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });
  
  const effectivePaginationModel = paginationModel ?? internalPaginationModel;
  const handlePaginationModelChange = onPaginationModelChange ?? setInternalPaginationModel;

  return (
    <Box sx={{ width: '100%', height: autoHeight ? 'auto' : height, ...sx }}>
      {(title || subtitle) && (
        <Box sx={{ mb: 2 }}>
          {title && (
            <Typography variant="h5" component="h2" gutterBottom sx={{ 
              color: theme.colors.primary,
              fontWeight: 600 
            }}>
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      )}
      
      <StyledDataGrid<T>
        // Core Props
        columns={columns}
        rows={rows}
        dataSource={dataSource}
        
        // State Management
        paginationModel={effectivePaginationModel}
        onPaginationModelChange={handlePaginationModelChange}
        sortModel={sortModel}
        onSortModelChange={onSortModelChange}
        filterModel={filterModel}
        onFilterModelChange={onFilterModelChange}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={onRowSelectionModelChange}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={onColumnVisibilityModelChange}
        density={density}
        
        // Row Management
        rowCount={rowCount}
        rowCountMode={rowCountMode}
        getRowId={getRowId}
        getRowHeight={getRowHeight}
        
        // Loading
        loading={loading}
        
        // Selection
        checkboxSelection={checkboxSelection}
        disableRowSelectionOnClick={disableRowSelectionOnClick}
        keepNonExistentRowsSelected={keepNonExistentRowsSelected}
        
        // Server-side modes
        pagination={pagination}
        pageSizeOptions={pageSizeOptions}
        sortingMode={sortingMode}
        filterMode={filterMode}
        paginationMode={paginationMode}
        
        // UI Features
        autoHeight={autoHeight}
        
        // Toolbar
        slots={{
          toolbar: showToolbar ? EnhancedToolbar : undefined,
        }}
        slotProps={{
          toolbar: {
            onRefresh,
            showQuickFilter,
            csvOptions,
            excelOptions,
            printOptions,
            customActions: customToolbarActions,
          },
        }}
        
        // Events
        onRowClick={onRowClick}
        onRowDoubleClick={onRowDoubleClick}
        onCellClick={onCellClick}
        
        // Additional Props
        {...otherProps}
      />
    </Box>
  );
};

// Export utilities and components
export { StatusChip, EnhancedToolbar };
export type { EnhancedDataGridProps, EnhancedToolbarProps, StatusChipProps };

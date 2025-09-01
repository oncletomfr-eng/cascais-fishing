'use client';

import React from 'react';
import {
  GridDataSource,
  GridGetRowsParams,
  GridGetRowsResponse,
  GridRowModel,
  GridValidRowModel,
  GridFilterModel,
  GridSortModel,
  GridPaginationModel,
  GridRowId,
  GridFilterItem,
  GridSortItem
} from '@mui/x-data-grid';

// Server Response Types
export interface ServerResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  success: boolean;
  message?: string;
}

export interface ServerError {
  message: string;
  code: string;
  statusCode: number;
}

// Data Fetcher Function Type
export interface DataFetcher<T = any> {
  (params: {
    page: number;
    pageSize: number;
    sortModel?: GridSortModel;
    filterModel?: GridFilterModel;
    search?: string;
  }): Promise<ServerResponse<T>>;
}

// Server-side DataSource Hook
export interface UseServerDataSourceOptions<T extends GridValidRowModel = GridRowModel> {
  fetcher: DataFetcher<T>;
  transform?: (data: any) => T;
  onError?: (error: ServerError) => void;
  onSuccess?: (data: ServerResponse<T>) => void;
  debounceMs?: number;
}

export const useServerDataSource = <T extends GridValidRowModel = GridRowModel>({
  fetcher,
  transform,
  onError,
  onSuccess,
  debounceMs = 300,
}: UseServerDataSourceOptions<T>): GridDataSource<T> => {
  const [loading, setLoading] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  // Transform grid filter to server format
  const transformFilters = (filterModel?: GridFilterModel) => {
    if (!filterModel?.items?.length) return {};
    
    const filters: Record<string, any> = {};
    
    filterModel.items.forEach((item: GridFilterItem) => {
      if (item.value !== undefined && item.value !== null && item.value !== '') {
        const { field, operator, value } = item;
        
        switch (operator) {
          case 'contains':
          case 'startsWith':
          case 'endsWith':
            filters[field] = { [operator]: value };
            break;
          case 'equals':
            filters[field] = value;
            break;
          case 'isAnyOf':
            filters[field] = { in: Array.isArray(value) ? value : [value] };
            break;
          case '>':
          case '>=':
          case '<':
          case '<=':
            filters[field] = { [operator]: value };
            break;
          case 'is':
            filters[field] = value === 'true';
            break;
          case 'not':
            filters[field] = { not: value };
            break;
          default:
            filters[field] = value;
        }
      }
    });
    
    return filters;
  };

  // Transform grid sort to server format
  const transformSort = (sortModel?: GridSortModel) => {
    if (!sortModel?.length) return undefined;
    
    return sortModel.map((sort: GridSortItem) => ({
      field: sort.field,
      direction: sort.sort || 'asc',
    }));
  };

  // Main data source implementation
  const dataSource: GridDataSource<T> = React.useMemo(() => ({
    getRows: async (params: GridGetRowsParams): Promise<GridGetRowsResponse<T>> => {
      return new Promise((resolve, reject) => {
        // Clear existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Debounce the request
        timeoutRef.current = setTimeout(async () => {
          try {
            setLoading(true);
            
            // Transform grid parameters to server format
            const serverParams = {
              page: params.start / (params.end - params.start),
              pageSize: params.end - params.start,
              sortModel: transformSort(params.sortModel),
              filterModel: transformFilters(params.filterModel),
              search: params.filterModel?.quickFilterValues?.join(' ') || undefined,
            };

            // Fetch data from server
            const response = await fetcher(serverParams);
            
            if (!response.success) {
              throw new Error(response.message || 'Failed to fetch data');
            }

            // Transform data if transformer provided
            const transformedData = response.data.map((item: any) => 
              transform ? transform(item) : item as T
            );

            // Success callback
            if (onSuccess) {
              onSuccess(response);
            }

            // Resolve with grid format
            resolve({
              rows: transformedData,
              rowCount: response.total,
            });
            
          } catch (error: any) {
            const serverError: ServerError = {
              message: error.message || 'An unexpected error occurred',
              code: error.code || 'FETCH_ERROR',
              statusCode: error.statusCode || 500,
            };

            if (onError) {
              onError(serverError);
            }

            reject(serverError);
          } finally {
            setLoading(false);
          }
        }, debounceMs);
      });
    },
  }), [fetcher, transform, onError, onSuccess, debounceMs]);

  return dataSource;
};

// Client-side Data Hook for local operations
export interface UseClientDataOptions<T extends GridValidRowModel = GridRowModel> {
  data: T[];
  getRowId?: (row: T) => GridRowId;
  defaultPageSize?: number;
}

export const useClientData = <T extends GridValidRowModel = GridRowModel>({
  data,
  getRowId,
  defaultPageSize = 25,
}: UseClientDataOptions<T>) => {
  const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
    page: 0,
    pageSize: defaultPageSize,
  });
  
  const [sortModel, setSortModel] = React.useState<GridSortModel>([]);
  const [filterModel, setFilterModel] = React.useState<GridFilterModel>({ items: [] });

  return {
    rows: data,
    paginationModel,
    onPaginationModelChange: setPaginationModel,
    sortModel,
    onSortModelChange: setSortModel,
    filterModel,
    onFilterModelChange: setFilterModel,
    getRowId,
    rowCount: data.length,
  };
};

// Example API fetcher implementation
export const createApiFetcher = <T = any>(baseUrl: string): DataFetcher<T> => {
  return async (params) => {
    const searchParams = new URLSearchParams();
    
    // Add pagination
    searchParams.set('page', params.page.toString());
    searchParams.set('pageSize', params.pageSize.toString());
    
    // Add sorting
    if (params.sortModel?.length) {
      searchParams.set('sort', JSON.stringify(params.sortModel));
    }
    
    // Add filters
    if (params.filterModel?.items?.length) {
      searchParams.set('filter', JSON.stringify(params.filterModel));
    }
    
    // Add search
    if (params.search) {
      searchParams.set('search', params.search);
    }

    const response = await fetch(`${baseUrl}?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    return {
      data: result.data || result.items || result,
      total: result.total || result.count || result.data?.length || 0,
      page: result.page || params.page,
      pageSize: result.pageSize || params.pageSize,
      success: true,
    };
  };
};

// Mock data fetcher for development
export const createMockFetcher = <T = any>(
  mockData: T[],
  delay: number = 500
): DataFetcher<T> => {
  return async (params) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, delay));
    
    let filteredData = [...mockData];
    
    // Apply search filter
    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      filteredData = filteredData.filter((item: any) => 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(searchTerm)
        )
      );
    }
    
    // Apply field filters
    if (params.filterModel?.items?.length) {
      filteredData = filteredData.filter((item: any) => {
        return params.filterModel!.items.every((filter) => {
          const fieldValue = item[filter.field];
          const filterValue = filter.value;
          
          switch (filter.operator) {
            case 'contains':
              return String(fieldValue).toLowerCase().includes(String(filterValue).toLowerCase());
            case 'equals':
              return fieldValue === filterValue;
            case 'startsWith':
              return String(fieldValue).toLowerCase().startsWith(String(filterValue).toLowerCase());
            case 'endsWith':
              return String(fieldValue).toLowerCase().endsWith(String(filterValue).toLowerCase());
            case '>':
              return Number(fieldValue) > Number(filterValue);
            case '>=':
              return Number(fieldValue) >= Number(filterValue);
            case '<':
              return Number(fieldValue) < Number(filterValue);
            case '<=':
              return Number(fieldValue) <= Number(filterValue);
            default:
              return true;
          }
        });
      });
    }
    
    // Apply sorting
    if (params.sortModel?.length) {
      params.sortModel.forEach(sort => {
        filteredData.sort((a: any, b: any) => {
          const aVal = a[sort.field];
          const bVal = b[sort.field];
          
          let comparison = 0;
          if (aVal < bVal) comparison = -1;
          else if (aVal > bVal) comparison = 1;
          
          return sort.direction === 'desc' ? -comparison : comparison;
        });
      });
    }
    
    // Apply pagination
    const startIndex = params.page * params.pageSize;
    const endIndex = startIndex + params.pageSize;
    const paginatedData = filteredData.slice(startIndex, endIndex);
    
    return {
      data: paginatedData,
      total: filteredData.length,
      page: params.page,
      pageSize: params.pageSize,
      success: true,
    };
  };
};

// Export utilities
export type {
  GridDataSource,
  GridGetRowsParams,
  GridGetRowsResponse,
  GridFilterModel,
  GridSortModel,
  GridPaginationModel,
};

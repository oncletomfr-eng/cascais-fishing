/**
 * Global Search Hook
 * Task 7.3: Global Search Functionality
 * 
 * Custom hook for managing global search functionality with
 * search history, saved searches, and advanced search operators
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { SearchSuggestion, SearchQuery, SavedSearch } from '@/components/transactions/GlobalSearchBar';

// Local storage keys
const SEARCH_HISTORY_KEY = 'transaction_search_history';
const SAVED_SEARCHES_KEY = 'transaction_saved_searches';

// Search history item
interface SearchHistoryItem {
  query: string;
  timestamp: Date;
  resultCount?: number;
}

interface UseGlobalSearchProps {
  onSearchExecute?: (query: SearchQuery, searchText: string) => void;
  onSearchClear?: () => void;
  maxHistoryItems?: number;
  debounceMs?: number;
}

interface UseGlobalSearchReturn {
  // Current search state
  searchValue: string;
  setSearchValue: (value: string) => void;
  isSearching: boolean;
  
  // Search execution
  executeSearch: (query?: SearchQuery) => void;
  clearSearch: () => void;
  
  // Search history
  searchHistory: SearchHistoryItem[];
  addToHistory: (query: string, resultCount?: number) => void;
  removeFromHistory: (index: number) => void;
  clearHistory: () => void;
  
  // Saved searches
  savedSearches: SavedSearch[];
  saveCurrentSearch: (name: string, description?: string) => SavedSearch | null;
  loadSavedSearch: (savedSearch: SavedSearch) => void;
  deleteSavedSearch: (id: string) => void;
  updateSavedSearch: (id: string, updates: Partial<SavedSearch>) => void;
  
  // Search suggestions
  suggestions: SearchSuggestion[];
  setSuggestions: (suggestions: SearchSuggestion[]) => void;
  
  // Search parsing and validation
  parseQuery: (query: string) => SearchQuery;
  isValidQuery: (query: string) => boolean;
  getSearchSummary: (query: SearchQuery) => string;
  
  // Recent searches and popular searches
  recentSearches: string[];
  popularSearches: string[];
  
  // Search analytics
  getSearchStats: () => {
    totalSearches: number;
    uniqueQueries: number;
    mostUsedOperators: string[];
    averageResultsPerSearch: number;
  };
}

export function useGlobalSearch({
  onSearchExecute,
  onSearchClear,
  maxHistoryItems = 50,
  debounceMs = 300
}: UseGlobalSearchProps = {}): UseGlobalSearchReturn {
  
  // Core search state
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  
  // Search history state
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  // Load saved data from localStorage on mount
  useEffect(() => {
    try {
      // Load search history
      const savedHistory = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
        setSearchHistory(parsedHistory);
      }

      // Load saved searches
      const savedSearchesData = localStorage.getItem(SAVED_SEARCHES_KEY);
      if (savedSearchesData) {
        const parsedSavedSearches = JSON.parse(savedSearchesData).map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          lastUsed: new Date(item.lastUsed)
        }));
        setSavedSearches(parsedSavedSearches);
      }
    } catch (error) {
      console.error('Failed to load search data from localStorage:', error);
    }
  }, []);

  // Save search history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  }, [searchHistory]);

  // Save saved searches to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(savedSearches));
    } catch (error) {
      console.error('Failed to save searches:', error);
    }
  }, [savedSearches]);

  // Parse search query to extract operators and values
  const parseQuery = useCallback((query: string): SearchQuery => {
    if (!query.trim()) {
      return { text: '' };
    }

    // Handle operator-based queries
    const operatorMatch = query.match(/^(\w+):\s*(.+)$/);
    if (operatorMatch) {
      const [, field, value] = operatorMatch;
      return {
        text: query.trim(),
        operator: `${field}:`,
        field: field.toLowerCase(),
        value: value.trim()
      };
    }

    // Handle quoted exact matches
    const exactMatch = query.match(/^"(.+)"$/);
    if (exactMatch) {
      return {
        text: query.trim(),
        operator: 'exact:',
        field: 'exact',
        value: exactMatch[1]
      };
    }

    // Default to general text search
    return { text: query.trim() };
  }, []);

  // Validate search query
  const isValidQuery = useCallback((query: string): boolean => {
    if (!query.trim()) return false;
    
    const parsed = parseQuery(query);
    
    // Check for valid operators
    if (parsed.operator) {
      const validOperators = ['customer:', 'amount:', 'date:', 'status:', 'payment:', 'exact:'];
      if (!validOperators.includes(parsed.operator)) {
        return false;
      }
      
      // Validate operator-specific formats
      if (parsed.operator === 'amount:' && parsed.value) {
        // Amount should be numeric or have comparison operators
        const amountPattern = /^[<>=]?\d+(\.\d+)?$/;
        return amountPattern.test(parsed.value);
      }
      
      if (parsed.operator === 'date:' && parsed.value) {
        // Date should be valid format
        const datePattern = /^\d{4}(-\d{1,2}(-\d{1,2})?)?$|^(today|yesterday|week|month|year)$/;
        return datePattern.test(parsed.value);
      }
    }
    
    return true;
  }, [parseQuery]);

  // Get human-readable search summary
  const getSearchSummary = useCallback((query: SearchQuery): string => {
    if (!query.text) return '';
    
    if (query.operator && query.field && query.value) {
      switch (query.field) {
        case 'customer':
          return `Customer search: ${query.value}`;
        case 'amount':
          return `Amount search: €${query.value}`;
        case 'date':
          return `Date search: ${query.value}`;
        case 'status':
          return `Status search: ${query.value}`;
        case 'payment':
          return `Payment method: ${query.value}`;
        case 'exact':
          return `Exact match: "${query.value}"`;
        default:
          return query.text;
      }
    }
    
    return `General search: ${query.text}`;
  }, []);

  // Execute search
  const executeSearch = useCallback((customQuery?: SearchQuery) => {
    const query = customQuery || parseQuery(searchValue);
    
    if (!isValidQuery(query.text)) {
      console.warn('Invalid search query:', query.text);
      return;
    }

    setIsSearching(true);
    
    try {
      // Add to history
      addToHistory(query.text);
      
      // Execute the search callback
      onSearchExecute?.(query, query.text);
      
      // Update any saved search usage
      const matchingSavedSearch = savedSearches.find(saved => saved.query === query.text);
      if (matchingSavedSearch) {
        updateSavedSearch(matchingSavedSearch.id, {
          lastUsed: new Date(),
          useCount: matchingSavedSearch.useCount + 1
        });
      }
      
    } catch (error) {
      console.error('Search execution failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchValue, parseQuery, isValidQuery, onSearchExecute, savedSearches]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchValue('');
    setSuggestions([]);
    setIsSearching(false);
    onSearchClear?.();
  }, [onSearchClear]);

  // Add to search history
  const addToHistory = useCallback((query: string, resultCount?: number) => {
    if (!query.trim()) return;
    
    setSearchHistory(prev => {
      // Remove any existing instance of this query
      const filtered = prev.filter(item => item.query !== query);
      
      // Add the new search to the front
      const newHistory = [
        {
          query,
          timestamp: new Date(),
          resultCount
        },
        ...filtered
      ];
      
      // Limit history size
      return newHistory.slice(0, maxHistoryItems);
    });
  }, [maxHistoryItems]);

  // Remove from search history
  const removeFromHistory = useCallback((index: number) => {
    setSearchHistory(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Clear search history
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  }, []);

  // Save current search
  const saveCurrentSearch = useCallback((name: string, description?: string): SavedSearch | null => {
    if (!searchValue.trim() || !name.trim()) {
      return null;
    }

    const newSavedSearch: SavedSearch = {
      id: `saved_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      name: name.trim(),
      query: searchValue.trim(),
      description: description?.trim() || getSearchSummary(parseQuery(searchValue.trim())),
      createdAt: new Date(),
      lastUsed: new Date(),
      useCount: 1,
      userId: 'current-user' // TODO: Get from session
    };

    setSavedSearches(prev => [...prev, newSavedSearch]);
    return newSavedSearch;
  }, [searchValue, getSearchSummary, parseQuery]);

  // Load saved search
  const loadSavedSearch = useCallback((savedSearch: SavedSearch) => {
    setSearchValue(savedSearch.query);
    
    // Update usage statistics
    updateSavedSearch(savedSearch.id, {
      lastUsed: new Date(),
      useCount: savedSearch.useCount + 1
    });
    
    // Execute the search
    const query = parseQuery(savedSearch.query);
    executeSearch(query);
  }, [parseQuery, executeSearch]);

  // Delete saved search
  const deleteSavedSearch = useCallback((id: string) => {
    setSavedSearches(prev => prev.filter(search => search.id !== id));
  }, []);

  // Update saved search
  const updateSavedSearch = useCallback((id: string, updates: Partial<SavedSearch>) => {
    setSavedSearches(prev =>
      prev.map(search =>
        search.id === id
          ? { ...search, ...updates }
          : search
      )
    );
  }, []);

  // Get recent searches (last 10)
  const recentSearches = useMemo(() => {
    return searchHistory
      .slice(0, 10)
      .map(item => item.query);
  }, [searchHistory]);

  // Get popular searches (most frequently used)
  const popularSearches = useMemo(() => {
    const queryCount = searchHistory.reduce((acc, item) => {
      acc[item.query] = (acc[item.query] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(queryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([query]) => query);
  }, [searchHistory]);

  // Get search statistics
  const getSearchStats = useCallback(() => {
    const totalSearches = searchHistory.length;
    const uniqueQueries = new Set(searchHistory.map(item => item.query)).size;
    
    // Count operator usage
    const operatorCounts = searchHistory.reduce((acc, item) => {
      const parsed = parseQuery(item.query);
      if (parsed.operator) {
        acc[parsed.operator] = (acc[parsed.operator] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const mostUsedOperators = Object.entries(operatorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([operator]) => operator);
    
    const totalResults = searchHistory.reduce((sum, item) => sum + (item.resultCount || 0), 0);
    const averageResultsPerSearch = totalSearches > 0 ? totalResults / totalSearches : 0;

    return {
      totalSearches,
      uniqueQueries,
      mostUsedOperators,
      averageResultsPerSearch
    };
  }, [searchHistory, parseQuery]);

  return {
    // Current search state
    searchValue,
    setSearchValue,
    isSearching,
    
    // Search execution
    executeSearch,
    clearSearch,
    
    // Search history
    searchHistory,
    addToHistory,
    removeFromHistory,
    clearHistory,
    
    // Saved searches
    savedSearches,
    saveCurrentSearch,
    loadSavedSearch,
    deleteSavedSearch,
    updateSavedSearch,
    
    // Search suggestions
    suggestions,
    setSuggestions,
    
    // Search parsing and validation
    parseQuery,
    isValidQuery,
    getSearchSummary,
    
    // Recent and popular searches
    recentSearches,
    popularSearches,
    
    // Search analytics
    getSearchStats
  };
}

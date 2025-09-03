/**
 * Global Search Bar Component
 * Task 7.3: Global Search Functionality
 * 
 * Powerful search capabilities with auto-complete, search operators,
 * search history, and real-time suggestions across transaction data
 */

'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  TextField,
  InputAdornment,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Chip,
  Typography,
  Divider,
  Button,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
  Card,
  CardContent,
  Stack,
  Alert,
  Autocomplete,
  Popper,
  ClickAwayListener
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  History as HistoryIcon,
  Save as SaveIcon,
  FilterList as FilterListIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  Receipt as ReceiptIcon,
  CreditCard as CreditCardIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  QuestionMark as QuestionMarkIcon,
  BookmarkBorder as BookmarkIcon,
  Bookmark as BookmarkFilledIcon,
  MoreVert as MoreVertIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Highlight as HighlightIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { debounce } from 'lodash-es';
import { format, isValid, parseISO } from 'date-fns';
import { toast } from 'sonner';

// Search interfaces
export interface SearchSuggestion {
  id: string;
  type: 'transaction' | 'customer' | 'amount' | 'date' | 'payment_method' | 'recent';
  text: string;
  description?: string;
  count?: number;
  icon?: React.ReactNode;
  metadata?: Record<string, any>;
}

export interface SearchOperator {
  operator: string;
  description: string;
  example: string;
  icon: React.ReactNode;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  description?: string;
  createdAt: Date;
  lastUsed: Date;
  useCount: number;
  userId: string;
}

export interface SearchQuery {
  text: string;
  operator?: string;
  field?: string;
  value?: string;
}

interface GlobalSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (query: SearchQuery) => void;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

// Search operators configuration
const SEARCH_OPERATORS: SearchOperator[] = [
  {
    operator: 'exact:',
    description: 'Exact match search',
    example: 'exact:"John Smith"',
    icon: <SearchIcon fontSize="small" />
  },
  {
    operator: 'customer:',
    description: 'Search by customer name or email',
    example: 'customer:john@example.com',
    icon: <PersonIcon fontSize="small" />
  },
  {
    operator: 'amount:',
    description: 'Search by amount (>, <, =)',
    example: 'amount:>100',
    icon: <MoneyIcon fontSize="small" />
  },
  {
    operator: 'date:',
    description: 'Search by date range',
    example: 'date:2024-01-01..2024-01-31',
    icon: <CalendarIcon fontSize="small" />
  },
  {
    operator: 'status:',
    description: 'Search by transaction status',
    example: 'status:completed',
    icon: <ReceiptIcon fontSize="small" />
  },
  {
    operator: 'payment:',
    description: 'Search by payment method',
    example: 'payment:card',
    icon: <CreditCardIcon fontSize="small" />
  }
];

export function GlobalSearchBar({
  value,
  onChange,
  onSearch,
  onSuggestionSelect,
  placeholder = 'Search transactions... (use operators like customer:, amount:, date:)',
  disabled = false,
  loading = false,
  className = ''
}: GlobalSearchBarProps) {
  // State management
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showOperators, setShowOperators] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [operatorMenuAnchor, setOperatorMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced search suggestions
  const debouncedGetSuggestions = useMemo(
    () => debounce(async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await fetch(`/api/search-suggestions?q=${encodeURIComponent(query)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
        }
      } catch (error) {
        console.error('Failed to fetch search suggestions:', error);
      }
    }, 300),
    []
  );

  // Parse search query for operators
  const parseSearchQuery = useCallback((query: string): SearchQuery => {
    const operatorMatch = query.match(/^(\w+):\s*(.+)$/);
    
    if (operatorMatch) {
      const [, operator, value] = operatorMatch;
      return {
        text: query,
        operator: `${operator}:`,
        field: operator,
        value: value.trim()
      };
    }

    return { text: query };
  }, []);

  // Handle input change
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    onChange(newValue);
    
    if (newValue.trim()) {
      debouncedGetSuggestions(newValue.trim());
    } else {
      setSuggestions([]);
    }
  }, [onChange, debouncedGetSuggestions]);

  // Handle key press
  const handleKeyPress = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      
      if (value.trim()) {
        const query = parseSearchQuery(value.trim());
        
        // Add to search history
        setSearchHistory(prev => {
          const newHistory = [value.trim(), ...prev.filter(item => item !== value.trim())];
          return newHistory.slice(0, 10); // Keep only last 10 searches
        });
        
        // Trigger search
        onSearch?.(query);
        
        // Clear suggestions
        setSuggestions([]);
        setFocused(false);
        inputRef.current?.blur();

        toast.success('Search executed', {
          description: `Searching for: ${value.trim()}`
        });
      }
    } else if (event.key === 'Escape') {
      setFocused(false);
      setSuggestions([]);
      inputRef.current?.blur();
    }
  }, [value, parseSearchQuery, onSearch]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    onChange(suggestion.text);
    onSuggestionSelect?.(suggestion);
    
    // Add to history if it's a search
    if (suggestion.type !== 'recent') {
      setSearchHistory(prev => {
        const newHistory = [suggestion.text, ...prev.filter(item => item !== suggestion.text)];
        return newHistory.slice(0, 10);
      });
    }
    
    setSuggestions([]);
    setFocused(false);
  }, [onChange, onSuggestionSelect]);

  // Handle history item click
  const handleHistoryClick = useCallback((query: string) => {
    onChange(query);
    const parsedQuery = parseSearchQuery(query);
    onSearch?.(parsedQuery);
    setShowHistory(false);
    setFocused(false);
  }, [onChange, parseSearchQuery, onSearch]);

  // Handle operator click
  const handleOperatorClick = useCallback((operator: SearchOperator) => {
    const currentValue = value.trim();
    const newValue = currentValue ? `${currentValue} ${operator.operator}` : operator.operator;
    onChange(newValue);
    setOperatorMenuAnchor(null);
    inputRef.current?.focus();
  }, [value, onChange]);

  // Clear search
  const clearSearch = useCallback(() => {
    onChange('');
    setSuggestions([]);
    setFocused(false);
  }, [onChange]);

  // Save current search
  const saveCurrentSearch = useCallback(() => {
    if (!value.trim()) return;
    
    const searchName = prompt('Enter a name for this search:');
    if (!searchName) return;

    const newSavedSearch: SavedSearch = {
      id: `saved_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      name: searchName.trim(),
      query: value.trim(),
      description: `Saved search: ${value.trim()}`,
      createdAt: new Date(),
      lastUsed: new Date(),
      useCount: 1,
      userId: 'current-user' // TODO: Get from session
    };

    setSavedSearches(prev => [...prev, newSavedSearch]);
    toast.success('Search saved', {
      description: `Saved as: ${searchName}`
    });
  }, [value]);

  // Generate suggestions based on input
  const generateSuggestions = useCallback(() => {
    if (!value.trim()) {
      // Show recent searches when input is empty but focused
      const recentSuggestions: SearchSuggestion[] = searchHistory.slice(0, 5).map((query, index) => ({
        id: `recent_${index}`,
        type: 'recent',
        text: query,
        description: 'Recent search',
        icon: <HistoryIcon fontSize="small" />
      }));
      
      return recentSuggestions;
    }

    return suggestions;
  }, [value, suggestions, searchHistory]);

  const currentSuggestions = generateSuggestions();

  // Render suggestion item
  const renderSuggestion = useCallback((suggestion: SearchSuggestion) => {
    const getTypeColor = (type: string) => {
      switch (type) {
        case 'transaction': return 'primary';
        case 'customer': return 'secondary';
        case 'amount': return 'success';
        case 'date': return 'warning';
        case 'payment_method': return 'info';
        case 'recent': return 'default';
        default: return 'default';
      }
    };

    return (
      <ListItem
        key={suggestion.id}
        component="div"
        onClick={() => handleSuggestionClick(suggestion)}
        sx={{
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'action.hover'
          }
        }}
      >
        <ListItemIcon sx={{ minWidth: 32 }}>
          {suggestion.icon || <SearchIcon fontSize="small" />}
        </ListItemIcon>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">{suggestion.text}</Typography>
              <Chip 
                label={suggestion.type} 
                size="small" 
                color={getTypeColor(suggestion.type) as any}
                variant="outlined"
              />
            </Box>
          }
          secondary={suggestion.description}
        />
        {suggestion.count !== undefined && (
          <Typography variant="caption" color="textSecondary">
            {suggestion.count} results
          </Typography>
        )}
      </ListItem>
    );
  }, [handleSuggestionClick]);

  return (
    <Box className={className} sx={{ position: 'relative' }}>
      <TextField
        ref={inputRef}
        fullWidth
        variant="outlined"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        onFocus={() => setFocused(true)}
        disabled={disabled}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color={loading ? 'disabled' : 'action'} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <Stack direction="row" spacing={0.5} alignItems="center">
                {/* Search Operators Button */}
                <Tooltip title="Search Operators">
                  <IconButton
                    size="small"
                    onClick={(e) => setOperatorMenuAnchor(e.currentTarget)}
                    color={showOperators ? 'primary' : 'default'}
                  >
                    <QuestionMarkIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                {/* Search History Button */}
                {searchHistory.length > 0 && (
                  <Tooltip title="Search History">
                    <IconButton
                      size="small"
                      onClick={() => setShowHistory(!showHistory)}
                      color={showHistory ? 'primary' : 'default'}
                    >
                      <Badge badgeContent={searchHistory.length} color="primary" max={9}>
                        <HistoryIcon fontSize="small" />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                )}

                {/* Save Search Button */}
                {value.trim() && (
                  <Tooltip title="Save Search">
                    <IconButton
                      size="small"
                      onClick={saveCurrentSearch}
                    >
                      <SaveIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}

                {/* Clear Button */}
                {value && (
                  <IconButton
                    size="small"
                    onClick={clearSearch}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            </InputAdornment>
          )
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'primary.main',
              borderWidth: 2
            }
          }
        }}
      />

      {/* Search Suggestions */}
      <AnimatePresence>
        {focused && currentSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 1300
            }}
          >
            <Paper
              ref={suggestionsRef}
              elevation={8}
              sx={{
                mt: 1,
                maxHeight: 300,
                overflow: 'auto',
                border: 1,
                borderColor: 'divider'
              }}
            >
              <List disablePadding>
                {currentSuggestions.map(renderSuggestion)}
              </List>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search History Panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 1200
            }}
          >
            <Card sx={{ mt: 1 }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2">Search History</Typography>
                  <IconButton
                    size="small"
                    onClick={() => setShowHistory(false)}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Stack spacing={1}>
                  {searchHistory.map((query, index) => (
                    <Chip
                      key={index}
                      label={query}
                      size="small"
                      variant="outlined"
                      onClick={() => handleHistoryClick(query)}
                      onDelete={() => {
                        setSearchHistory(prev => prev.filter((_, i) => i !== index));
                      }}
                      clickable
                      icon={<HistoryIcon />}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Operators Menu */}
      <Menu
        anchorEl={operatorMenuAnchor}
        open={Boolean(operatorMenuAnchor)}
        onClose={() => setOperatorMenuAnchor(null)}
        PaperProps={{
          sx: { maxWidth: 400 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>Search Operators</Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            Use these operators to refine your search:
          </Typography>
        </Box>
        <Divider />
        {SEARCH_OPERATORS.map((operator) => (
          <MenuItem
            key={operator.operator}
            onClick={() => handleOperatorClick(operator)}
            sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 1 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              {operator.icon}
              <Typography variant="body2" fontWeight="medium">
                {operator.operator}
              </Typography>
            </Box>
            <Typography variant="caption" color="textSecondary">
              {operator.description}
            </Typography>
            <Typography variant="caption" color="primary.main" fontFamily="monospace">
              Example: {operator.example}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}

export default GlobalSearchBar;

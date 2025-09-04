'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Typography,
  Box,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Pagination,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Collapse,
  Avatar,
  ListItemText,
  ListItem,
  List,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  Computer as ComputerIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  Description as DescriptionIcon,
  VpnKey as VpnKeyIcon,
  LocationOn as LocationIcon,
  DeviceHub as DeviceIcon,
} from '@mui/icons-material';
import { format, parseISO, subDays, subWeeks, subMonths } from 'date-fns';
import { toast } from 'sonner';

// Interfaces
export interface TaxAuditLogEntry {
  id: string;
  taxReportId?: string;
  taxDocumentId?: string;
  payoutId?: string;
  action: string;
  eventType: string;
  performedBy: string;
  performedByName?: string;
  description: string;
  previousData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  complianceLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  riskFlags: string[];
  performedAt: string;
  createdAt: string;
  taxReport?: {
    id: string;
    taxYear: number;
    reportType: string;
  };
  taxDocument?: {
    id: string;
    formType: string;
    captain: {
      name: string;
    };
  };
}

interface AuditFilters {
  dateRange: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  customStartDate: string;
  customEndDate: string;
  action: string;
  eventType: string;
  performedBy: string;
  complianceLevel: string;
  searchQuery: string;
  riskFlags: string[];
}

interface AuditStats {
  totalEntries: number;
  todayEntries: number;
  weekEntries: number;
  highRiskEntries: number;
  criticalEntries: number;
  topUsers: Array<{
    userId: string;
    userName: string;
    actionCount: number;
  }>;
  actionBreakdown: Record<string, number>;
  complianceLevelBreakdown: Record<string, number>;
}

const ACTION_COLORS = {
  CREATED: 'success',
  UPDATED: 'info',
  DELETED: 'error',
  GENERATED: 'primary',
  SENT: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  VALIDATED: 'info',
  CORRECTED: 'warning',
  ARCHIVED: 'default',
  ACCESSED: 'info',
  DOWNLOADED: 'info',
  EXPORTED: 'primary',
} as const;

const COMPLIANCE_COLORS = {
  LOW: 'success',
  NORMAL: 'info',
  HIGH: 'warning',
  CRITICAL: 'error',
} as const;

const EVENT_TYPE_ICONS = {
  REPORT_MANAGEMENT: <AssignmentIcon />,
  DOCUMENT_MANAGEMENT: <DescriptionIcon />,
  DATA_EXPORT: <DownloadIcon />,
  COMPLIANCE_CHECK: <SecurityIcon />,
  USER_ACCESS: <PersonIcon />,
  SYSTEM_MAINTENANCE: <ComputerIcon />,
  AUDIT_REVIEW: <VpnKeyIcon />,
  CORRECTION_PROCESS: <WarningIcon />,
  NOTIFICATION_SENT: <InfoIcon />,
};

interface TaxAuditTrailProps {
  taxYear?: number;
  reportId?: string;
  documentId?: string;
  compactView?: boolean;
  maxEntries?: number;
}

export default function TaxAuditTrail({ 
  taxYear, 
  reportId, 
  documentId, 
  compactView = false,
  maxEntries = 50 
}: TaxAuditTrailProps) {
  const { data: session } = useSession();
  
  // State management
  const [auditLogs, setAuditLogs] = useState<TaxAuditLogEntry[]>([]);
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(compactView ? 10 : 20);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filter state
  const [filters, setFilters] = useState<AuditFilters>({
    dateRange: 'month',
    customStartDate: '',
    customEndDate: '',
    action: '',
    eventType: '',
    performedBy: '',
    complianceLevel: '',
    searchQuery: '',
    riskFlags: [],
  });
  
  // Dialog state
  const [filterDialog, setFilterDialog] = useState(false);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TaxAuditLogEntry | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Load audit logs
  const loadAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        action: 'audit-logs',
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(taxYear && { taxYear: taxYear.toString() }),
        ...(reportId && { reportId }),
        ...(documentId && { documentId }),
        ...(filters.dateRange !== 'custom' && { dateRange: filters.dateRange }),
        ...(filters.customStartDate && { startDate: filters.customStartDate }),
        ...(filters.customEndDate && { endDate: filters.customEndDate }),
        ...(filters.action && { action: filters.action }),
        ...(filters.eventType && { eventType: filters.eventType }),
        ...(filters.performedBy && { performedBy: filters.performedBy }),
        ...(filters.complianceLevel && { complianceLevel: filters.complianceLevel }),
        ...(filters.searchQuery && { search: filters.searchQuery }),
        ...(filters.riskFlags.length > 0 && { riskFlags: filters.riskFlags.join(',') }),
      });

      const response = await fetch(`/api/tax-reporting?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.entries || []);
        setTotalPages(Math.ceil((data.total || 0) / pageSize));
        
        if (data.stats) {
          setAuditStats(data.stats);
        }
      } else {
        throw new Error('Failed to load audit logs');
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, taxYear, reportId, documentId, filters]);

  // Load audit logs on mount and when dependencies change
  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  // Apply filters
  const handleApplyFilters = useCallback(() => {
    setPage(1);
    setFilterDialog(false);
    loadAuditLogs();
  }, [loadAuditLogs]);

  // Clear filters
  const handleClearFilters = useCallback(() => {
    setFilters({
      dateRange: 'month',
      customStartDate: '',
      customEndDate: '',
      action: '',
      eventType: '',
      performedBy: '',
      complianceLevel: '',
      searchQuery: '',
      riskFlags: [],
    });
    setPage(1);
    setFilterDialog(false);
  }, []);

  // Toggle row expansion
  const toggleRowExpansion = (entryId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedRows(newExpanded);
  };

  // Format change data for display
  const formatChangeData = (entry: TaxAuditLogEntry) => {
    if (!entry.previousData && !entry.newData) return null;

    return (
      <Box>
        {entry.previousData && (
          <Box mb={1}>
            <Typography variant="caption" color="textSecondary">
              Previous:
            </Typography>
            <Paper variant="outlined" sx={{ p: 1, backgroundColor: 'grey.50' }}>
              <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(entry.previousData, null, 2)}
              </Typography>
            </Paper>
          </Box>
        )}
        {entry.newData && (
          <Box>
            <Typography variant="caption" color="textSecondary">
              New:
            </Typography>
            <Paper variant="outlined" sx={{ p: 1, backgroundColor: 'success.50' }}>
              <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(entry.newData, null, 2)}
              </Typography>
            </Paper>
          </Box>
        )}
      </Box>
    );
  };

  // Get risk level color
  const getRiskLevelColor = (riskFlags: string[]) => {
    if (riskFlags.length === 0) return 'success';
    if (riskFlags.some(flag => flag.includes('CRITICAL'))) return 'error';
    if (riskFlags.some(flag => flag.includes('HIGH'))) return 'warning';
    return 'info';
  };

  if (!session || session.user.role !== 'ADMIN') {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            Admin access required to view audit trail.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {!compactView && (
        <CardHeader
          title={
            <Box display="flex" alignItems="center" gap={2}>
              <SecurityIcon />
              <Typography variant="h6">
                Tax Audit Trail
                {taxYear && ` - ${taxYear}`}
              </Typography>
            </Box>
          }
          action={
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => setFilterDialog(true)}
              >
                Filters
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => toast.info('Export feature coming soon')}
              >
                Export
              </Button>
            </Box>
          }
        />
      )}

      <CardContent>
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Stats Cards */}
        {!compactView && auditStats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 1 }}>
                  <Typography variant="h6">{auditStats.totalEntries}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Total Entries
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 1 }}>
                  <Typography variant="h6">{auditStats.todayEntries}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Today
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 1 }}>
                  <Typography variant="h6" color="warning.main">
                    {auditStats.highRiskEntries}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    High Risk
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 1 }}>
                  <Typography variant="h6" color="error.main">
                    {auditStats.criticalEntries}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Critical
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Quick search */}
        {!compactView && (
          <TextField
            fullWidth
            placeholder="Search audit logs..."
            variant="outlined"
            size="small"
            value={filters.searchQuery}
            onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
            onKeyPress={(e) => e.key === 'Enter' && handleApplyFilters()}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ mb: 2 }}
          />
        )}

        {/* Audit logs table */}
        <TableContainer component={Paper} variant="outlined">
          <Table size={compactView ? 'small' : 'medium'}>
            <TableHead>
              <TableRow>
                <TableCell width="40px"></TableCell>
                <TableCell>Timestamp</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Event Type</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Risk Level</TableCell>
                {!compactView && <TableCell>IP Address</TableCell>}
                <TableCell width="80px">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {auditLogs.map((entry) => (
                <React.Fragment key={entry.id}>
                  <TableRow hover>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => toggleRowExpansion(entry.id)}
                      >
                        <ExpandMoreIcon 
                          sx={{ 
                            transform: expandedRows.has(entry.id) ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s'
                          }} 
                        />
                      </IconButton>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {format(parseISO(entry.performedAt), 'MMM dd, yyyy')}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {format(parseISO(entry.performedAt), 'HH:mm:ss')}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={entry.action}
                        color={ACTION_COLORS[entry.action as keyof typeof ACTION_COLORS] as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {EVENT_TYPE_ICONS[entry.eventType as keyof typeof EVENT_TYPE_ICONS] || <InfoIcon />}
                        <Typography variant="body2">
                          {entry.eventType.replace(/_/g, ' ')}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 24, height: 24 }}>
                          <PersonIcon sx={{ fontSize: 16 }} />
                        </Avatar>
                        <Typography variant="body2">
                          {entry.performedByName || entry.performedBy}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {entry.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={entry.complianceLevel}
                          color={COMPLIANCE_COLORS[entry.complianceLevel]}
                          size="small"
                        />
                        {entry.riskFlags.length > 0 && (
                          <Chip
                            icon={<WarningIcon />}
                            label={entry.riskFlags.length}
                            color={getRiskLevelColor(entry.riskFlags)}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </TableCell>
                    {!compactView && (
                      <TableCell>
                        <Typography variant="caption" color="textSecondary">
                          {entry.ipAddress || 'N/A'}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small"
                          onClick={() => {
                            setSelectedEntry(entry);
                            setDetailDialog(true);
                          }}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded row details */}
                  <TableRow>
                    <TableCell colSpan={compactView ? 8 : 9} sx={{ py: 0 }}>
                      <Collapse in={expandedRows.has(entry.id)} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Additional Details
                          </Typography>
                          
                          <Grid container spacing={2}>
                            {entry.sessionId && (
                              <Grid item xs={12} sm={6} md={4}>
                                <Typography variant="caption" color="textSecondary">
                                  Session ID:
                                </Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                  {entry.sessionId}
                                </Typography>
                              </Grid>
                            )}
                            
                            {entry.userAgent && (
                              <Grid item xs={12} sm={6} md={8}>
                                <Typography variant="caption" color="textSecondary">
                                  User Agent:
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                                  {entry.userAgent}
                                </Typography>
                              </Grid>
                            )}

                            {entry.riskFlags.length > 0 && (
                              <Grid item xs={12}>
                                <Typography variant="caption" color="textSecondary">
                                  Risk Flags:
                                </Typography>
                                <Box display="flex" gap={0.5} mt={0.5}>
                                  {entry.riskFlags.map((flag, index) => (
                                    <Chip 
                                      key={index}
                                      label={flag}
                                      size="small"
                                      color="warning"
                                      variant="outlined"
                                    />
                                  ))}
                                </Box>
                              </Grid>
                            )}

                            {(entry.previousData || entry.newData) && (
                              <Grid item xs={12}>
                                <Typography variant="caption" color="textSecondary">
                                  Data Changes:
                                </Typography>
                                <Box mt={1}>
                                  {formatChangeData(entry)}
                                </Box>
                              </Grid>
                            )}
                          </Grid>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {!compactView && totalPages > 1 && (
          <Box display="flex" justifyContent="center" mt={2}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, newPage) => setPage(newPage)}
              color="primary"
            />
          </Box>
        )}

        {auditLogs.length === 0 && !loading && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No audit log entries found for the current filters.
          </Alert>
        )}
      </CardContent>

      {/* Filter Dialog */}
      <Dialog open={filterDialog} onClose={() => setFilterDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Filter Audit Trail</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                >
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="week">Past Week</MenuItem>
                  <MenuItem value="month">Past Month</MenuItem>
                  <MenuItem value="quarter">Past Quarter</MenuItem>
                  <MenuItem value="year">Past Year</MenuItem>
                  <MenuItem value="custom">Custom Range</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Compliance Level</InputLabel>
                <Select
                  value={filters.complianceLevel}
                  onChange={(e) => setFilters(prev => ({ ...prev, complianceLevel: e.target.value }))}
                >
                  <MenuItem value="">All Levels</MenuItem>
                  <MenuItem value="LOW">Low</MenuItem>
                  <MenuItem value="NORMAL">Normal</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="CRITICAL">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {filters.dateRange === 'custom' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    margin="normal"
                    label="Start Date"
                    type="date"
                    value={filters.customStartDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, customStartDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    margin="normal"
                    label="End Date"
                    type="date"
                    value={filters.customEndDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, customEndDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Action</InputLabel>
                <Select
                  value={filters.action}
                  onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                >
                  <MenuItem value="">All Actions</MenuItem>
                  {Object.keys(ACTION_COLORS).map((action) => (
                    <MenuItem key={action} value={action}>
                      {action}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Event Type</InputLabel>
                <Select
                  value={filters.eventType}
                  onChange={(e) => setFilters(prev => ({ ...prev, eventType: e.target.value }))}
                >
                  <MenuItem value="">All Events</MenuItem>
                  {Object.keys(EVENT_TYPE_ICONS).map((eventType) => (
                    <MenuItem key={eventType} value={eventType}>
                      {eventType.replace(/_/g, ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                margin="normal"
                label="Search Description"
                value={filters.searchQuery}
                onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                placeholder="Search in descriptions..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClearFilters}>Clear All</Button>
          <Button onClick={() => setFilterDialog(false)}>Cancel</Button>
          <Button onClick={handleApplyFilters} variant="contained">Apply Filters</Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog 
        open={detailDialog} 
        onClose={() => setDetailDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Audit Log Details
          {selectedEntry && (
            <Typography variant="subtitle2" color="textSecondary">
              {format(parseISO(selectedEntry.performedAt), 'PPpp')}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedEntry && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>Action</Typography>
                <Chip 
                  label={selectedEntry.action}
                  color={ACTION_COLORS[selectedEntry.action as keyof typeof ACTION_COLORS] as any}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>Event Type</Typography>
                <Typography variant="body2">
                  {selectedEntry.eventType.replace(/_/g, ' ')}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Description</Typography>
                <Typography variant="body2">{selectedEntry.description}</Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>Performed By</Typography>
                <Typography variant="body2">
                  {selectedEntry.performedByName || selectedEntry.performedBy}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>IP Address</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {selectedEntry.ipAddress || 'N/A'}
                </Typography>
              </Grid>

              {selectedEntry.sessionId && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Session ID</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {selectedEntry.sessionId}
                  </Typography>
                </Grid>
              )}

              {selectedEntry.userAgent && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>User Agent</Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem', wordBreak: 'break-all' }}>
                    {selectedEntry.userAgent}
                  </Typography>
                </Grid>
              )}

              {selectedEntry.riskFlags.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Risk Flags</Typography>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {selectedEntry.riskFlags.map((flag, index) => (
                      <Chip 
                        key={index}
                        label={flag}
                        color="warning"
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Box>
                </Grid>
              )}

              {(selectedEntry.previousData || selectedEntry.newData) && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Data Changes</Typography>
                  {formatChangeData(selectedEntry)}
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

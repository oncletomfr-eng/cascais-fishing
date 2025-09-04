'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Typography,
  Tabs,
  Tab,
  Box,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
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
  Divider,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  CircularProgress,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  AccountBalance as ReportIcon,
  Description as DocumentIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  FileCopy as FileCopyIcon,
  Assignment as AssignmentIcon,
  CloudDownload as CloudDownloadIcon,
  Visibility as VisibilityIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Timeline as TimelineIcon,
  PictureAsPdf as PdfIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  PointElement,
} from 'chart.js';
import { toast } from 'sonner';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  PointElement
);

// Interfaces
export interface TaxDashboardData {
  taxYear: number;
  summary: {
    totalGrossCommissions: number;
    totalPayouts: number;
    totalCaptains: number;
    totalDocuments: number;
    documentsByStatus: Record<string, number>;
  };
  monthlyData: Array<{
    month: string;
    monthNumber: number;
    commissions: number;
    payouts: number;
    captains: number;
    transactions: number;
  }>;
  recentDocuments: Array<{
    id: string;
    documentType: string;
    formType: string;
    captainName: string;
    totalAmount: number;
    status: string;
    generatedAt: string | null;
    createdAt: string;
  }>;
}

export interface TaxReport {
  id: string;
  taxYear: number;
  reportType: 'ANNUAL' | 'QUARTERLY' | 'MONTHLY' | 'CUSTOM';
  quarterNumber?: number;
  status: string;
  totalGrossCommissions: number;
  totalNetCommissions: number;
  totalPayouts: number;
  totalCaptains: number;
  totalTransactions: number;
  generatedAt: string | null;
  createdAt: string;
  _count: {
    taxDocuments: number;
  };
}

export interface TaxDocument {
  id: string;
  documentType: string;
  formType: string;
  taxYear: number;
  totalAmount: number;
  box7Amount: number | null;
  status: string;
  generatedAt: string | null;
  sentAt: string | null;
  captain: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  isValidated: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tax-tabpanel-${index}`}
      aria-labelledby={`tax-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function TaxReportingDashboard() {
  const { data: session } = useSession();
  const [tabValue, setTabValue] = useState(0);
  const [currentTaxYear, setCurrentTaxYear] = useState(new Date().getFullYear());
  const [dashboardData, setDashboardData] = useState<TaxDashboardData | null>(null);
  const [taxReports, setTaxReports] = useState<TaxReport[]>([]);
  const [taxDocuments, setTaxDocuments] = useState<TaxDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Dialog states
  const [reportDialog, setReportDialog] = useState(false);
  const [documentDialog, setDocumentDialog] = useState(false);
  const [bulkGenerateDialog, setBulkGenerateDialog] = useState(false);

  // Form states
  const [reportForm, setReportForm] = useState({
    reportType: 'ANNUAL' as const,
    quarterNumber: 1,
    customStart: '',
    customEnd: '',
    captainIds: [] as string[],
  });

  const [documentForm, setDocumentForm] = useState({
    captainId: '',
    documentType: 'FORM_1099_MISC' as const,
    forceRegenerate: false,
  });

  // Load dashboard data
  const loadDashboardData = useCallback(async (taxYear: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tax-reporting?action=dashboard&taxYear=${taxYear}`);
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        throw new Error('Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load tax dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load tax reports
  const loadTaxReports = useCallback(async (taxYear: number) => {
    try {
      const response = await fetch(`/api/tax-reporting?action=reports&taxYear=${taxYear}`);
      if (response.ok) {
        const data = await response.json();
        setTaxReports(data);
      }
    } catch (error) {
      console.error('Error loading tax reports:', error);
    }
  }, []);

  // Load tax documents
  const loadTaxDocuments = useCallback(async (taxYear: number) => {
    try {
      const response = await fetch(`/api/tax-reporting?action=documents&taxYear=${taxYear}`);
      if (response.ok) {
        const data = await response.json();
        setTaxDocuments(data);
      }
    } catch (error) {
      console.error('Error loading tax documents:', error);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    loadDashboardData(currentTaxYear);
    loadTaxReports(currentTaxYear);
    loadTaxDocuments(currentTaxYear);
  }, [currentTaxYear, loadDashboardData, loadTaxReports, loadTaxDocuments]);

  // Generate tax report
  const handleGenerateReport = async () => {
    try {
      setGenerating(true);
      const response = await fetch('/api/tax-reporting?action=generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxYear: currentTaxYear,
          ...reportForm,
        }),
      });

      if (response.ok) {
        toast.success('Tax report generated successfully');
        setReportDialog(false);
        loadTaxReports(currentTaxYear);
        loadDashboardData(currentTaxYear);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  // Generate 1099-MISC document
  const handleGenerate1099MISC = async () => {
    try {
      setGenerating(true);
      const response = await fetch('/api/tax-reporting?action=generate-1099-misc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxYear: currentTaxYear,
          ...documentForm,
        }),
      });

      if (response.ok) {
        toast.success('1099-MISC document generated successfully');
        setDocumentDialog(false);
        loadTaxDocuments(currentTaxYear);
        loadDashboardData(currentTaxYear);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate document');
      }
    } catch (error) {
      console.error('Error generating 1099-MISC:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate document');
    } finally {
      setGenerating(false);
    }
  };

  // Download PDF document
  const handleDownloadPDF = async (documentId: string, filename: string) => {
    try {
      const response = await fetch(`/api/tax-reporting?action=download-pdf&documentId=${documentId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('PDF downloaded successfully');
      } else {
        throw new Error('Failed to download PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'default';
      case 'generated': return 'info';
      case 'validated': return 'primary';
      case 'approved': return 'success';
      case 'sent': return 'warning';
      case 'received': return 'success';
      case 'filed': return 'success';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  // Chart data for monthly overview
  const monthlyChartData = useMemo(() => {
    if (!dashboardData) return null;

    return {
      labels: dashboardData.monthlyData.map(d => d.month),
      datasets: [
        {
          label: 'Commission Income (€)',
          data: dashboardData.monthlyData.map(d => d.commissions),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          yAxisID: 'y',
        },
        {
          label: 'Total Payouts (€)',
          data: dashboardData.monthlyData.map(d => d.payouts),
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
          yAxisID: 'y',
        },
      ],
    };
  }, [dashboardData]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Monthly Tax Overview - ${currentTaxYear}`,
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Amount (€)',
        },
      },
    },
  };

  // Available tax years
  const taxYears = Array.from(
    { length: 5 }, 
    (_, i) => new Date().getFullYear() - i
  );

  if (!session || session.user.role !== 'ADMIN') {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            Admin access required to view tax reporting dashboard.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" gap={2}>
              <ReportIcon />
              <Typography variant="h5">Tax Reporting Dashboard</Typography>
            </Box>
          }
          action={
            <Box display="flex" gap={2} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Tax Year</InputLabel>
                <Select
                  value={currentTaxYear}
                  label="Tax Year"
                  onChange={(e) => setCurrentTaxYear(Number(e.target.value))}
                >
                  {taxYears.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  loadDashboardData(currentTaxYear);
                  loadTaxReports(currentTaxYear);
                  loadTaxDocuments(currentTaxYear);
                }}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>
          }
        />
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Summary Cards */}
      {dashboardData && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Commission Income
                </Typography>
                <Typography variant="h4">
                  €{dashboardData.summary.totalGrossCommissions.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Payouts
                </Typography>
                <Typography variant="h4">
                  €{dashboardData.summary.totalPayouts.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Captains
                </Typography>
                <Typography variant="h4">
                  {dashboardData.summary.totalCaptains}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Tax Documents
                </Typography>
                <Typography variant="h4">
                  {dashboardData.summary.totalDocuments}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Main Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Overview" icon={<TimelineIcon />} />
            <Tab label="Tax Reports" icon={<ReportIcon />} />
            <Tab label="1099-MISC Documents" icon={<DocumentIcon />} />
            <Tab label="Audit Trail" icon={<AssignmentIcon />} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {/* Overview Tab */}
          <Grid container spacing={3}>
            {monthlyChartData && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Bar data={monthlyChartData} options={chartOptions} />
                  </CardContent>
                </Card>
              </Grid>
            )}

            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Document Status Distribution" />
                <CardContent>
                  {dashboardData?.summary.documentsByStatus && Object.entries(dashboardData.summary.documentsByStatus).map(([status, count]) => (
                    <Box key={status} display="flex" justifyContent="space-between" mb={1}>
                      <Chip 
                        label={status} 
                        color={getStatusColor(status) as any}
                        size="small" 
                      />
                      <Typography variant="body2">{count}</Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Recent Documents" />
                <CardContent>
                  {dashboardData?.recentDocuments.slice(0, 5).map((doc) => (
                    <Box key={doc.id} mb={2}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">
                          {doc.formType} - {doc.captainName}
                        </Typography>
                        <Chip 
                          label={doc.status} 
                          color={getStatusColor(doc.status) as any}
                          size="small" 
                        />
                      </Box>
                      <Typography variant="caption" color="textSecondary">
                        €{doc.totalAmount.toFixed(2)} - {format(parseISO(doc.createdAt), 'MMM dd, yyyy')}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Tax Reports Tab */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">Tax Reports for {currentTaxYear}</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setReportDialog(true)}
            >
              Generate New Report
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Period</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Commission Income</TableCell>
                  <TableCell>Captains</TableCell>
                  <TableCell>Documents</TableCell>
                  <TableCell>Generated</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {taxReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Chip label={report.reportType} size="small" />
                      {report.quarterNumber && ` Q${report.quarterNumber}`}
                    </TableCell>
                    <TableCell>
                      {report.reportType === 'ANNUAL' ? `${report.taxYear}` : 
                       report.reportType === 'QUARTERLY' ? `Q${report.quarterNumber} ${report.taxYear}` :
                       format(parseISO(report.createdAt), 'MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={report.status} 
                        color={getStatusColor(report.status) as any}
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>€{(report.totalGrossCommissions / 100).toFixed(2)}</TableCell>
                    <TableCell>{report.totalCaptains}</TableCell>
                    <TableCell>{report._count.taxDocuments}</TableCell>
                    <TableCell>
                      {report.generatedAt ? format(parseISO(report.generatedAt), 'MMM dd, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small">
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton size="small">
                        <DownloadIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* 1099-MISC Documents Tab */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">1099-MISC Documents for {currentTaxYear}</Typography>
            <Box>
              <Button
                variant="outlined"
                startIcon={<FileCopyIcon />}
                onClick={() => setBulkGenerateDialog(true)}
                sx={{ mr: 1 }}
              >
                Bulk Generate
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setDocumentDialog(true)}
              >
                Generate Document
              </Button>
            </Box>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Captain</TableCell>
                  <TableCell>Form Type</TableCell>
                  <TableCell>Total Amount</TableCell>
                  <TableCell>Box 7 Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Generated</TableCell>
                  <TableCell>Validated</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {taxDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{doc.captain.name}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {doc.captain.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={doc.formType} size="small" />
                    </TableCell>
                    <TableCell>€{doc.totalAmount.toFixed(2)}</TableCell>
                    <TableCell>€{doc.box7Amount?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={doc.status} 
                        color={getStatusColor(doc.status) as any}
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      {doc.generatedAt ? format(parseISO(doc.generatedAt), 'MMM dd, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        icon={doc.isValidated ? <CheckCircleIcon /> : <WarningIcon />}
                        label={doc.isValidated ? 'Yes' : 'No'}
                        color={doc.isValidated ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Download PDF">
                        <IconButton 
                          size="small"
                          onClick={() => handleDownloadPDF(doc.id, `1099-MISC-${doc.taxYear}-${doc.captain.name}.pdf`)}
                        >
                          <PdfIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Send via Email">
                        <IconButton size="small">
                          <EmailIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {/* Audit Trail Tab */}
          <Typography variant="h6" mb={3}>Audit Trail</Typography>
          <Alert severity="info">
            Audit trail functionality will be implemented to show all tax-related actions,
            including document generation, status changes, and report creation.
          </Alert>
        </TabPanel>
      </Card>

      {/* Generate Report Dialog */}
      <Dialog 
        open={reportDialog} 
        onClose={() => setReportDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generate Tax Report</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Report Type</InputLabel>
            <Select
              value={reportForm.reportType}
              onChange={(e) => setReportForm(prev => ({ ...prev, reportType: e.target.value as any }))}
            >
              <MenuItem value="ANNUAL">Annual Report</MenuItem>
              <MenuItem value="QUARTERLY">Quarterly Report</MenuItem>
              <MenuItem value="MONTHLY">Monthly Report</MenuItem>
              <MenuItem value="CUSTOM">Custom Period</MenuItem>
            </Select>
          </FormControl>

          {reportForm.reportType === 'QUARTERLY' && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Quarter</InputLabel>
              <Select
                value={reportForm.quarterNumber}
                onChange={(e) => setReportForm(prev => ({ ...prev, quarterNumber: Number(e.target.value) }))}
              >
                <MenuItem value={1}>Q1 (Jan-Mar)</MenuItem>
                <MenuItem value={2}>Q2 (Apr-Jun)</MenuItem>
                <MenuItem value={3}>Q3 (Jul-Sep)</MenuItem>
                <MenuItem value={4}>Q4 (Oct-Dec)</MenuItem>
              </Select>
            </FormControl>
          )}

          {reportForm.reportType === 'CUSTOM' && (
            <Box>
              <TextField
                fullWidth
                margin="normal"
                label="Start Date"
                type="date"
                value={reportForm.customStart}
                onChange={(e) => setReportForm(prev => ({ ...prev, customStart: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                margin="normal"
                label="End Date"
                type="date"
                value={reportForm.customEnd}
                onChange={(e) => setReportForm(prev => ({ ...prev, customEnd: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleGenerateReport} 
            variant="contained"
            disabled={generating}
          >
            {generating ? <CircularProgress size={20} /> : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generate 1099-MISC Dialog */}
      <Dialog 
        open={documentDialog} 
        onClose={() => setDocumentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generate 1099-MISC Document</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Captain ID"
            value={documentForm.captainId}
            onChange={(e) => setDocumentForm(prev => ({ ...prev, captainId: e.target.value }))}
            placeholder="Enter captain user ID"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={documentForm.forceRegenerate}
                onChange={(e) => setDocumentForm(prev => ({ ...prev, forceRegenerate: e.target.checked }))}
              />
            }
            label="Force Regenerate (if document already exists)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocumentDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleGenerate1099MISC} 
            variant="contained"
            disabled={generating || !documentForm.captainId}
          >
            {generating ? <CircularProgress size={20} /> : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Speed Dial for Quick Actions */}
      <SpeedDial
        ariaLabel="Tax Reporting Actions"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        <SpeedDialAction
          icon={<ReportIcon />}
          tooltipTitle="Generate Report"
          onClick={() => setReportDialog(true)}
        />
        <SpeedDialAction
          icon={<DocumentIcon />}
          tooltipTitle="Generate 1099-MISC"
          onClick={() => setDocumentDialog(true)}
        />
        <SpeedDialAction
          icon={<CloudDownloadIcon />}
          tooltipTitle="Export Data"
          onClick={() => toast.info('Export feature coming soon')}
        />
        <SpeedDialAction
          icon={<RefreshIcon />}
          tooltipTitle="Refresh All"
          onClick={() => {
            loadDashboardData(currentTaxYear);
            loadTaxReports(currentTaxYear);
            loadTaxDocuments(currentTaxYear);
          }}
        />
      </SpeedDial>
    </Box>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Typography,
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
  Box,
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
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Assignment as FormIcon,
  AccountBalance as TaxIcon,
  Person as PersonIcon,
  MonetizationOn as MoneyIcon,
  DateRange as DateIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import { format, parseISO, startOfYear, endOfYear } from 'date-fns';
import { toast } from 'sonner';

// Interfaces
export interface Captain {
  id: string;
  name: string;
  email: string;
  taxDocuments?: TaxDocument1099[];
}

export interface TaxDocument1099 {
  id: string;
  documentType: string;
  formType: string;
  taxYear: number;
  totalAmount: number;
  box1Amount?: number;
  box2Amount?: number;
  box3Amount?: number;
  box4Amount?: number;
  box5Amount?: number;
  box6Amount?: number;
  box7Amount?: number;
  box8Amount?: number;
  box9Amount?: number;
  box10Amount?: number;
  box11Amount?: number;
  box12Amount?: number;
  box13Amount?: number;
  box14Amount?: number;
  recipientTin?: string;
  recipientName: string;
  recipientAddress?: any;
  payerTin?: string;
  payerName: string;
  payerAddress?: any;
  status: string;
  isValidated: boolean;
  validationErrors?: any;
  complianceFlags: string[];
  isCorrection: boolean;
  correctionReason?: string;
  generatedAt?: string;
  sentAt?: string;
  createdAt: string;
}

export interface PayoutSummary {
  captainId: string;
  captainName: string;
  taxYear: number;
  totalPayouts: number;
  totalCommissions: number;
  payoutCount: number;
  periodStart: string;
  periodEnd: string;
  averageCommissionRate: number;
}

const FORM_1099_MISC_BOXES = [
  { key: 'box1Amount', label: 'Box 1: Rents', description: 'Rent payments of $600 or more' },
  { key: 'box2Amount', label: 'Box 2: Royalties', description: 'Royalty payments of $10 or more' },
  { key: 'box3Amount', label: 'Box 3: Other Income', description: 'Other income payments of $600 or more' },
  { key: 'box4Amount', label: 'Box 4: Federal Income Tax Withheld', description: 'Federal income tax withheld' },
  { key: 'box5Amount', label: 'Box 5: Fishing Boat Proceeds', description: 'Fishing boat proceeds' },
  { key: 'box6Amount', label: 'Box 6: Medical and Health Care Payments', description: 'Medical and health care payments' },
  { key: 'box7Amount', label: 'Box 7: Nonemployee Compensation', description: 'Nonemployee compensation of $600 or more (Primary for our use case)' },
  { key: 'box8Amount', label: 'Box 8: Substitute Payments', description: 'Substitute payments in lieu of dividends or interest' },
  { key: 'box9Amount', label: 'Box 9: Direct Sales', description: 'Direct sales of $5,000 or more' },
  { key: 'box10Amount', label: 'Box 10: Crop Insurance Proceeds', description: 'Crop insurance proceeds' },
  { key: 'box11Amount', label: 'Box 11: Foreign Tax Paid', description: 'Foreign tax paid' },
  { key: 'box12Amount', label: 'Box 12: Section 409A Deferrals', description: 'Section 409A deferrals' },
  { key: 'box13Amount', label: 'Box 13: Excess Golden Parachute Payments', description: 'Excess golden parachute payments' },
  { key: 'box14Amount', label: 'Box 14: Gross Proceeds Paid to Attorney', description: 'Gross proceeds paid to attorney' },
];

const GENERATION_STEPS = [
  'Select Captain',
  'Review Payout Data',
  'Configure Form Details',
  'Validate Information',
  'Generate Document',
];

interface Form1099MISCGeneratorProps {
  open: boolean;
  onClose: () => void;
  initialCaptainId?: string;
  taxYear: number;
}

export default function Form1099MISCGenerator({ 
  open, 
  onClose, 
  initialCaptainId, 
  taxYear 
}: Form1099MISCGeneratorProps) {
  const { data: session } = useSession();
  
  // Step management
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Captain data
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [selectedCaptain, setSelectedCaptain] = useState<Captain | null>(null);
  const [payoutSummary, setPayoutSummary] = useState<PayoutSummary | null>(null);

  // Form data
  const [formData, setFormData] = useState<Partial<TaxDocument1099>>({
    documentType: 'FORM_1099_MISC',
    formType: '1099-MISC',
    taxYear,
    box7Amount: 0, // Primary field for nonemployee compensation
    recipientName: '',
    payerName: 'Cascais Fishing Platform',
    payerAddress: {
      street: 'Rua Example, 123',
      city: 'Cascais',
      state: 'Lisbon',
      zipCode: '2750-000',
      country: 'Portugal',
    },
    isCorrection: false,
    complianceFlags: [],
  });

  // Validation state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [complianceWarnings, setComplianceWarnings] = useState<string[]>([]);

  // Load captains with commission data
  const loadCaptains = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/commission-tracking?action=captains&taxYear=${taxYear}`);
      if (response.ok) {
        const data = await response.json();
        setCaptains(data);
        
        // Auto-select captain if provided
        if (initialCaptainId) {
          const captain = data.find((c: Captain) => c.id === initialCaptainId);
          if (captain) {
            setSelectedCaptain(captain);
            setActiveStep(1);
          }
        }
      }
    } catch (error) {
      console.error('Error loading captains:', error);
      toast.error('Failed to load captain data');
    } finally {
      setLoading(false);
    }
  }, [taxYear, initialCaptainId]);

  // Load payout summary for selected captain
  const loadPayoutSummary = useCallback(async (captainId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/payout-management?action=tax-summary&captainId=${captainId}&taxYear=${taxYear}`);
      if (response.ok) {
        const data = await response.json();
        setPayoutSummary(data);
        
        // Pre-populate form with commission data
        setFormData(prev => ({
          ...prev,
          totalAmount: data.totalCommissions,
          box7Amount: data.totalCommissions, // Nonemployee compensation
          recipientName: data.captainName,
        }));
      }
    } catch (error) {
      console.error('Error loading payout summary:', error);
      toast.error('Failed to load payout data');
    } finally {
      setLoading(false);
    }
  }, [taxYear]);

  // Validate form data
  const validateFormData = useCallback(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!formData.recipientName) {
      errors.push('Recipient name is required');
    }
    
    if (!formData.totalAmount || formData.totalAmount <= 0) {
      errors.push('Total amount must be greater than 0');
    }

    // IRS compliance validation
    if (formData.box7Amount && formData.box7Amount >= 60000) { // $600 threshold in cents
      if (!formData.recipientTin) {
        warnings.push('TIN (Tax Identification Number) is recommended for amounts $600 or more');
      }
    }

    // Total amount validation
    const totalBoxAmounts = FORM_1099_MISC_BOXES.reduce((sum, box) => {
      return sum + ((formData as any)[box.key] || 0);
    }, 0);

    if (totalBoxAmounts !== formData.totalAmount && totalBoxAmounts > 0) {
      warnings.push('Total amount does not match sum of individual boxes');
    }

    // Year validation
    const currentYear = new Date().getFullYear();
    if (formData.taxYear && (formData.taxYear > currentYear || formData.taxYear < currentYear - 5)) {
      warnings.push('Tax year should be within the last 5 years');
    }

    setValidationErrors(errors);
    setComplianceWarnings(warnings);

    return errors.length === 0;
  }, [formData]);

  // Generate 1099-MISC document
  const handleGenerate = async () => {
    if (!selectedCaptain) {
      toast.error('No captain selected');
      return;
    }

    try {
      setGenerating(true);
      const response = await fetch('/api/tax-reporting?action=generate-1099-misc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captainId: selectedCaptain.id,
          taxYear: formData.taxYear,
          documentType: 'FORM_1099_MISC',
          forceRegenerate: true,
          customData: formData, // Custom form data
        }),
      });

      if (response.ok) {
        const document = await response.json();
        toast.success('1099-MISC document generated successfully');
        setActiveStep(4); // Move to final step
        
        // Optionally auto-download
        handleDownloadPDF(document.id);
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

  // Download PDF
  const handleDownloadPDF = async (documentId: string) => {
    try {
      const response = await fetch(`/api/tax-reporting?action=download-pdf&documentId=${documentId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `1099-MISC-${taxYear}-${selectedCaptain?.name}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('PDF downloaded successfully');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  // Load data on mount
  useEffect(() => {
    if (open) {
      loadCaptains();
    }
  }, [open, loadCaptains]);

  // Load payout summary when captain is selected
  useEffect(() => {
    if (selectedCaptain) {
      loadPayoutSummary(selectedCaptain.id);
    }
  }, [selectedCaptain, loadPayoutSummary]);

  // Run validation when form data changes
  useEffect(() => {
    if (activeStep >= 2) {
      validateFormData();
    }
  }, [formData, activeStep, validateFormData]);

  const handleNext = () => {
    if (activeStep < GENERATION_STEPS.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setSelectedCaptain(null);
    setPayoutSummary(null);
    setFormData({
      documentType: 'FORM_1099_MISC',
      formType: '1099-MISC',
      taxYear,
      box7Amount: 0,
      recipientName: '',
      payerName: 'Cascais Fishing Platform',
      payerAddress: {
        street: 'Rua Example, 123',
        city: 'Cascais',
        state: 'Lisbon',
        zipCode: '2750-000',
        country: 'Portugal',
      },
      isCorrection: false,
      complianceFlags: [],
    });
    setValidationErrors([]);
    setComplianceWarnings([]);
  };

  if (!session || session.user.role !== 'ADMIN') {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogContent>
          <Alert severity="error">
            Admin access required to generate tax documents.
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <FormIcon />
          <Typography variant="h6">Generate 1099-MISC Form for {taxYear}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ width: '100%' }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {/* Step 1: Select Captain */}
            <Step>
              <StepLabel>
                <Box display="flex" alignItems="center" gap={1}>
                  <PersonIcon />
                  Select Captain
                </Box>
              </StepLabel>
              <StepContent>
                {loading ? (
                  <LinearProgress />
                ) : (
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Captain</InputLabel>
                    <Select
                      value={selectedCaptain?.id || ''}
                      onChange={(e) => {
                        const captain = captains.find(c => c.id === e.target.value);
                        setSelectedCaptain(captain || null);
                      }}
                    >
                      {captains.map((captain) => (
                        <MenuItem key={captain.id} value={captain.id}>
                          <Box>
                            <Typography variant="body2">{captain.name}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              {captain.email}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                
                <Box sx={{ mb: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={!selectedCaptain}
                    sx={{ mt: 1, mr: 1 }}
                  >
                    Continue
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Step 2: Review Payout Data */}
            <Step>
              <StepLabel>
                <Box display="flex" alignItems="center" gap={1}>
                  <MoneyIcon />
                  Review Payout Data
                </Box>
              </StepLabel>
              <StepContent>
                {payoutSummary ? (
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {payoutSummary.captainName} - {taxYear} Summary
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">
                            Total Commission Income
                          </Typography>
                          <Typography variant="h6">
                            €{(payoutSummary.totalCommissions / 100).toFixed(2)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">
                            Number of Payouts
                          </Typography>
                          <Typography variant="h6">
                            {payoutSummary.payoutCount}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">
                            Period
                          </Typography>
                          <Typography variant="body2">
                            {format(parseISO(payoutSummary.periodStart), 'MMM dd, yyyy')} - {format(parseISO(payoutSummary.periodEnd), 'MMM dd, yyyy')}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="body2" color="textSecondary">
                            Average Commission Rate
                          </Typography>
                          <Typography variant="body2">
                            {(payoutSummary.averageCommissionRate * 100).toFixed(1)}%
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ) : (
                  <LinearProgress />
                )}

                <Box sx={{ mb: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={!payoutSummary}
                    sx={{ mt: 1, mr: 1 }}
                  >
                    Continue
                  </Button>
                  <Button onClick={handleBack} sx={{ mt: 1, mr: 1 }}>
                    Back
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Step 3: Configure Form Details */}
            <Step>
              <StepLabel>
                <Box display="flex" alignItems="center" gap={1}>
                  <EditIcon />
                  Configure Form Details
                </Box>
              </StepLabel>
              <StepContent>
                <Grid container spacing={2}>
                  {/* Recipient Information */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Recipient Information
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Recipient Name"
                      value={formData.recipientName || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
                      error={validationErrors.some(e => e.includes('Recipient name'))}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Recipient TIN (Optional)"
                      value={formData.recipientTin || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, recipientTin: e.target.value }))}
                      placeholder="XX-XXXXXXX"
                    />
                  </Grid>

                  {/* Form Amounts - Focus on Box 7 */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Form 1099-MISC Amounts
                    </Typography>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      For fishing platform commissions, the primary field is Box 7: Nonemployee Compensation
                    </Alert>
                  </Grid>

                  {/* Box 7 - Primary field */}
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{ backgroundColor: 'action.hover' }}>
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          Box 7: Nonemployee Compensation (Primary)
                        </Typography>
                        <TextField
                          fullWidth
                          label="Amount (€)"
                          type="number"
                          value={formData.box7Amount ? (formData.box7Amount / 100) : ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            box7Amount: Math.round(parseFloat(e.target.value || '0') * 100),
                            totalAmount: Math.round(parseFloat(e.target.value || '0') * 100)
                          }))}
                          helperText="Commission income for independent contractor services"
                        />
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Other boxes (collapsible) */}
                  <Grid item xs={12}>
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>Other 1099-MISC Boxes (Optional)</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          {FORM_1099_MISC_BOXES.filter(box => box.key !== 'box7Amount').map((box) => (
                            <Grid item xs={6} key={box.key}>
                              <TextField
                                fullWidth
                                label={box.label}
                                type="number"
                                value={formData[box.key as keyof TaxDocument1099] ? ((formData[box.key as keyof TaxDocument1099] as number) / 100) : ''}
                                onChange={(e) => setFormData(prev => ({ 
                                  ...prev, 
                                  [box.key]: Math.round(parseFloat(e.target.value || '0') * 100)
                                }))}
                                helperText={box.description}
                                size="small"
                              />
                            </Grid>
                          ))}
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  </Grid>

                  {/* Correction settings */}
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.isCorrection || false}
                          onChange={(e) => setFormData(prev => ({ ...prev, isCorrection: e.target.checked }))}
                        />
                      }
                      label="This is a corrected form"
                    />
                    {formData.isCorrection && (
                      <TextField
                        fullWidth
                        label="Correction Reason"
                        value={formData.correctionReason || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, correctionReason: e.target.value }))}
                        multiline
                        rows={2}
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Grid>
                </Grid>

                <Box sx={{ mb: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    sx={{ mt: 1, mr: 1 }}
                  >
                    Continue
                  </Button>
                  <Button onClick={handleBack} sx={{ mt: 1, mr: 1 }}>
                    Back
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Step 4: Validate Information */}
            <Step>
              <StepLabel>
                <Box display="flex" alignItems="center" gap={1}>
                  <VerifiedIcon />
                  Validate Information
                </Box>
              </StepLabel>
              <StepContent>
                {/* Validation Results */}
                {validationErrors.length > 0 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Please fix the following errors:
                    </Typography>
                    <ul>
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </Alert>
                )}

                {complianceWarnings.length > 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Compliance Warnings:
                    </Typography>
                    <ul>
                      {complianceWarnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </Alert>
                )}

                {validationErrors.length === 0 && complianceWarnings.length === 0 && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <CheckCircleIcon />
                      <Typography>All validations passed. Ready to generate document.</Typography>
                    </Box>
                  </Alert>
                )}

                {/* Summary */}
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Document Summary
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">Recipient:</Typography>
                        <Typography variant="body2">{formData.recipientName}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">Tax Year:</Typography>
                        <Typography variant="body2">{formData.taxYear}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">Box 7 Amount:</Typography>
                        <Typography variant="body2">€{formData.box7Amount ? (formData.box7Amount / 100).toFixed(2) : '0.00'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">Total Amount:</Typography>
                        <Typography variant="body2">€{formData.totalAmount ? (formData.totalAmount / 100).toFixed(2) : '0.00'}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                <Box sx={{ mb: 1 }}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={validationErrors.length > 0}
                    sx={{ mt: 1, mr: 1 }}
                  >
                    Validate & Continue
                  </Button>
                  <Button onClick={handleBack} sx={{ mt: 1, mr: 1 }}>
                    Back
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Step 5: Generate Document */}
            <Step>
              <StepLabel>
                <Box display="flex" alignItems="center" gap={1}>
                  <TaxIcon />
                  Generate Document
                </Box>
              </StepLabel>
              <StepContent>
                <Typography variant="body1" gutterBottom>
                  Ready to generate the 1099-MISC document. This will create the official tax form 
                  with all the information you've provided.
                </Typography>

                <Box display="flex" gap={2} sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleGenerate}
                    disabled={generating || validationErrors.length > 0}
                    startIcon={generating ? <CircularProgress size={20} /> : <SaveIcon />}
                  >
                    {generating ? 'Generating...' : 'Generate 1099-MISC'}
                  </Button>
                  <Button onClick={handleBack} disabled={generating}>
                    Back
                  </Button>
                </Box>
              </StepContent>
            </Step>
          </Stepper>

          {activeStep === GENERATION_STEPS.length && (
            <Paper square elevation={0} sx={{ p: 3 }}>
              <Typography>1099-MISC document generated successfully!</Typography>
              <Button onClick={handleReset} sx={{ mt: 1, mr: 1 }}>
                Generate Another
              </Button>
              <Button variant="contained" onClick={onClose} sx={{ mt: 1, mr: 1 }}>
                Close
              </Button>
            </Paper>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={generating}>
          Close
        </Button>
        {activeStep > 0 && activeStep < GENERATION_STEPS.length - 1 && (
          <Button onClick={handleReset}>
            Reset
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

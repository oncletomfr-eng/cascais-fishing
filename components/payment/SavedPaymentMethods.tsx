/**
 * Saved Payment Methods Component
 * Task 5.5: Payment Method Storage & Management
 * 
 * Displays and manages user's saved payment methods with PCI compliant
 * card display, default selection, and secure deletion
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  CreditCard, 
  Trash2, 
  Star, 
  MoreVertical, 
  Shield, 
  Calendar,
  MapPin,
  Loader2
} from 'lucide-react';

export interface PaymentMethod {
  id: string;
  stripePaymentMethodId: string;
  type: string;
  isDefault: boolean;
  cardLast4?: string;
  cardBrand?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  billingName?: string;
  billingEmail?: string;
  billingCountry?: string;
  billingCity?: string;
  billingPostalCode?: string;
  status: string;
  createdAt: string;
  lastUsedAt?: string;
  payments?: Array<{
    id: string;
    amount: number;
    currency: string;
    createdAt: string;
    description?: string;
  }>;
}

export interface SavedPaymentMethodsProps {
  onRefresh?: () => void;
  enableAddNew?: boolean;
  onAddNew?: () => void;
}

export function SavedPaymentMethods({ 
  onRefresh, 
  enableAddNew = true, 
  onAddNew 
}: SavedPaymentMethodsProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  // Load payment methods
  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payment-methods');
      const data = await response.json();

      if (data.success) {
        setPaymentMethods(data.paymentMethods);
      } else {
        toast({
          title: 'Error loading payment methods',
          description: data.error || 'Failed to load saved payment methods',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      toast({
        title: 'Error loading payment methods',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Set payment method as default
  const setAsDefault = async (paymentMethodId: string) => {
    try {
      setActionLoading(paymentMethodId);
      const response = await fetch(`/api/payment-methods/${paymentMethodId}/set-default`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Default payment method updated',
          description: 'Your default payment method has been changed',
        });
        await loadPaymentMethods(); // Refresh the list
        onRefresh?.();
      } else {
        toast({
          title: 'Failed to set default',
          description: data.error || 'Please try again',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error setting default payment method:', error);
      toast({
        title: 'Error setting default',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Delete payment method
  const deletePaymentMethod = async (paymentMethodId: string) => {
    try {
      setActionLoading(paymentMethodId);
      const response = await fetch(`/api/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Payment method deleted',
          description: 'The payment method has been removed from your account',
        });
        await loadPaymentMethods(); // Refresh the list
        onRefresh?.();
      } else {
        toast({
          title: 'Failed to delete payment method',
          description: data.error || data.details || 'Please try again',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast({
        title: 'Error deleting payment method',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Format card brand for display
  const formatCardBrand = (brand?: string) => {
    if (!brand) return '';
    return brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
  };

  // Format expiration date
  const formatExpiration = (month?: number, year?: number) => {
    if (!month || !year) return '';
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(2)}`;
  };

  // Check if card is expired
  const isCardExpired = (month?: number, year?: number) => {
    if (!month || !year) return false;
    const now = new Date();
    const expiry = new Date(year, month - 1); // month is 0-indexed in JS Date
    return expiry < now;
  };

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Saved Payment Methods
          </CardTitle>
          <CardDescription>
            Manage your saved payment methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Saved Payment Methods
            </CardTitle>
            <CardDescription>
              Manage your saved payment methods securely
            </CardDescription>
          </div>
          {enableAddNew && (
            <Button onClick={onAddNew} variant="outline">
              Add New Method
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {paymentMethods.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No saved payment methods</h3>
            <p className="text-muted-foreground mb-4">
              Add a payment method to make future payments faster and more convenient.
            </p>
            {enableAddNew && (
              <Button onClick={onAddNew}>
                Add Your First Payment Method
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <Card 
                key={method.id} 
                className={`transition-colors ${
                  method.isDefault 
                    ? 'bg-primary/5 border-primary/20' 
                    : 'hover:bg-muted/50'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {/* Card Icon & Brand */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-white" />
                        </div>
                      </div>

                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {formatCardBrand(method.cardBrand)} •••• {method.cardLast4}
                          </span>
                          {method.isDefault && (
                            <Badge variant="default" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Default
                            </Badge>
                          )}
                          {isCardExpired(method.cardExpMonth, method.cardExpYear) && (
                            <Badge variant="destructive" className="text-xs">
                              Expired
                            </Badge>
                          )}
                        </div>

                        <div className="text-sm text-muted-foreground space-y-1">
                          {method.cardExpMonth && method.cardExpYear && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Expires {formatExpiration(method.cardExpMonth, method.cardExpYear)}
                            </div>
                          )}
                          
                          {method.billingName && (
                            <div>Name: {method.billingName}</div>
                          )}
                          
                          {method.billingCountry && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {method.billingCity && `${method.billingCity}, `}{method.billingCountry}
                            </div>
                          )}
                          
                          {method.lastUsedAt && (
                            <div className="text-xs">
                              Last used: {new Date(method.lastUsedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={actionLoading === method.id}
                        >
                          {actionLoading === method.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreVertical className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!method.isDefault && (
                          <DropdownMenuItem
                            onClick={() => setAsDefault(method.id)}
                            className="cursor-pointer"
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Set as Default
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="cursor-pointer text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Payment Method</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this payment method? This action cannot be undone.
                                <br /><br />
                                <strong>
                                  {formatCardBrand(method.cardBrand)} ending in {method.cardLast4}
                                </strong>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deletePaymentMethod(method.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* PCI Compliance Notice */}
                  <Separator className="my-3" />
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    <span>Secured and encrypted. We never store your full card details.</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

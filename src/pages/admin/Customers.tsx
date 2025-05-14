
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/dashboard/layout/DashboardLayout';
import CustomersTable from '@/components/dashboard/customers/CustomersTable';
import { Customer } from '@/types';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

// Fetch customers from Supabase
const fetchCustomers = async (): Promise<Customer[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name');
  
  if (error) {
    toast({
      title: "Error",
      description: "Failed to load customers",
      variant: "destructive"
    });
    throw error;
  }
  
  return data as Customer[];
};

const Customers = () => {
  const [filterValue, setFilterValue] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);

  // Queries
  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
  });

  if (error) {
    console.error('Error loading customers data:', error);
  }

  // Filter customers based on search input
  const filteredCustomers = customers.filter(customer => 
    (customer.full_name || '').toLowerCase().includes(filterValue.toLowerCase()) ||
    (customer.phone || '').includes(filterValue)
  );

  // Handlers
  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setViewDetailsOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold">Customers</h1>
        </div>

        <div className="flex items-center border rounded-md px-3 py-2 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground mr-2" />
          <Input 
            placeholder="Search customers..." 
            className="border-0 p-0 focus-visible:ring-0 focus-visible:outline-none"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" role="status">
                <span className="sr-only">Loading...</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Loading customers...</p>
            </div>
          </div>
        ) : (
          <CustomersTable
            customers={filteredCustomers}
            onViewDetails={handleViewDetails}
          />
        )}
      </div>

      {/* Customer Details Dialog */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              Detailed information about the customer.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-[100px_1fr] gap-1">
                      <div className="text-muted-foreground">Name:</div>
                      <div className="font-medium">{selectedCustomer.full_name || 'Unknown'}</div>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-1">
                      <div className="text-muted-foreground">Phone:</div>
                      <div>{selectedCustomer.phone || 'N/A'}</div>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-1">
                      <div className="text-muted-foreground">Address:</div>
                      <div>{selectedCustomer.address || 'N/A'}</div>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-1">
                      <div className="text-muted-foreground">Customer since:</div>
                      <div>{format(new Date(selectedCustomer.created_at), 'PPP')}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Customers;

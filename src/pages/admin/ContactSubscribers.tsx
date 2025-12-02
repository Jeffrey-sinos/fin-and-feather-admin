
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/dashboard/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { MessageSquare, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { exportToCSV } from '@/utils/csvExport';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

interface ContactNumber {
  id: string;
  phone_number: string;
  opt_in_reason: string;
  created_at: string;
}

const formSchema = z.object({
  phone_number: z.string()
    .min(10, { message: 'Phone number must be at least 10 digits.' })
    .regex(/^[0-9+\-\s()]*$/, { 
      message: 'Phone number can only contain digits, spaces, and these special characters: + - ( )' 
    }),
  opt_in_reason: z.string()
    .min(5, { message: 'Please provide a reason with at least 5 characters.' }),
});

type FormValues = z.infer<typeof formSchema>;

const ContactSubscribers = () => {
  const { data: contacts, isLoading, refetch } = useQuery({
    queryKey: ['contact-subscribers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_numbers')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        toast({
          variant: "destructive",
          title: "Error fetching contact subscribers",
          description: error.message,
        });
        throw error;
      }
      
      return data as ContactNumber[];
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone_number: '',
      opt_in_reason: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const { error } = await supabase
        .from('contact_numbers')
        .insert({
          phone_number: values.phone_number,
          opt_in_reason: values.opt_in_reason,
        });

      if (error) {
        if (error.code === '23505') { // Unique violation
          toast({
            variant: "destructive",
            title: "Subscription failed",
            description: "This phone number is already subscribed.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Subscription failed",
            description: error.message,
          });
        }
        return;
      }

      toast({
        title: "Success",
        description: "Contact added successfully.",
      });
      
      form.reset();
      refetch();
    } catch (error) {
      console.error('Error adding contact:', error);
      toast({
        variant: "destructive",
        title: "Subscription failed",
        description: "An unexpected error occurred.",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-bold">Contact Subscribers</h1>
          <Button
            variant="outline"
            onClick={() => {
              if (contacts && contacts.length > 0) {
                exportToCSV(contacts, 'contact_subscribers', [
                  { key: 'phone_number', header: 'Phone Number' },
                  { key: 'opt_in_reason', header: 'Opt-in Reason' },
                  { key: (c) => new Date(c.created_at).toLocaleDateString(), header: 'Subscription Date' },
                ]);
                toast({ title: 'Export Complete', description: 'Contact subscribers exported to CSV' });
              }
            }}
            disabled={!contacts || contacts.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Add New Contact Subscriber</CardTitle>
              <CardDescription>Add a new phone number to your contact list</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="phone_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="opt_in_reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opt-in Reason</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Example: Signed up via the contact form for promotional offers"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit">Add Subscriber</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Contact Subscribers Statistics
              </CardTitle>
              <CardDescription>Overview of your SMS/phone subscribers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? "Loading..." : contacts?.length || 0}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total contact subscribers</p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Contact Subscribers</CardTitle>
            <CardDescription>List of all phone numbers that have opted in for updates</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Opt-in Reason</TableHead>
                  <TableHead>Subscription Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3}>Loading subscribers...</TableCell>
                  </TableRow>
                ) : contacts?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>No contact subscribers yet.</TableCell>
                  </TableRow>
                ) : (
                  contacts?.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>{contact.phone_number}</TableCell>
                      <TableCell>{contact.opt_in_reason}</TableCell>
                      <TableCell>{new Date(contact.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ContactSubscribers;

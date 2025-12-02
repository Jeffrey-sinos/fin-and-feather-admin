
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/dashboard/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { Mail, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { exportToCSV } from '@/utils/csvExport';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

interface NewsletterSubscription {
  id: string;
  email: string;
  created_at: string;
}

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

type FormValues = z.infer<typeof formSchema>;

const Newsletter = () => {
  const { data: subscriptions, isLoading, refetch } = useQuery({
    queryKey: ['newsletter-subscribers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        toast({
          variant: "destructive",
          title: "Error fetching subscribers",
          description: error.message,
        });
        throw error;
      }
      
      return data as NewsletterSubscription[];
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const { error } = await supabase
        .from('newsletter_subscriptions')
        .insert({ email: values.email });

      if (error) {
        if (error.code === '23505') { // Unique violation
          toast({
            variant: "destructive",
            title: "Subscription failed",
            description: "This email is already subscribed to the newsletter.",
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
        description: "Email added to newsletter successfully.",
      });
      
      form.reset();
      refetch();
    } catch (error) {
      console.error('Error adding email:', error);
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
          <h1 className="text-3xl font-bold">Newsletter Management</h1>
          <Button
            variant="outline"
            onClick={() => {
              if (subscriptions && subscriptions.length > 0) {
                exportToCSV(subscriptions, 'newsletter_subscribers', [
                  { key: 'email', header: 'Email' },
                  { key: (s) => new Date(s.created_at).toLocaleDateString(), header: 'Subscribed Date' },
                ]);
                toast({ title: 'Export Complete', description: 'Newsletter subscribers exported to CSV' });
              }
            }}
            disabled={!subscriptions || subscriptions.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Add New Subscriber</CardTitle>
              <CardDescription>Add a new email to your newsletter list</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="email@example.com" {...field} />
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
                <Mail className="h-5 w-5" />
                Newsletter Statistics
              </CardTitle>
              <CardDescription>Overview of your newsletter subscribers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoading ? "Loading..." : subscriptions?.length || 0}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total subscribers</p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Newsletter Subscribers</CardTitle>
            <CardDescription>List of all emails subscribed to your newsletter</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Subscribed Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={2}>Loading subscribers...</TableCell>
                  </TableRow>
                ) : subscriptions?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2}>No subscribers yet.</TableCell>
                  </TableRow>
                ) : (
                  subscriptions?.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell>{subscription.email}</TableCell>
                      <TableCell>{new Date(subscription.created_at).toLocaleDateString()}</TableCell>
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

export default Newsletter;

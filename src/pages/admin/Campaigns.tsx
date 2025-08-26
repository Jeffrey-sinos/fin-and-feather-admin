import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import DashboardLayout from '@/components/dashboard/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, MessageSquare, Send, Eye, TestTube, Users, Clock, CheckCircle, XCircle } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  emailSubject: z.string().optional(),
  emailBody: z.string().optional(),
  smsText: z.string().max(1600, 'SMS text must be 1600 characters or less').optional(),
  sendEmail: z.boolean().default(false),
  sendSms: z.boolean().default(false),
  testEmail: z.string().email().optional().or(z.literal('')),
  testPhone: z.string().optional(),
}).refine(data => data.sendEmail || data.sendSms, {
  message: "At least one option (Email or SMS) must be selected",
  path: ["sendEmail"],
}).refine(data => !data.sendEmail || (data.emailSubject && data.emailBody), {
  message: "Email subject and body are required when sending emails",
  path: ["emailSubject"],
}).refine(data => !data.sendSms || data.smsText, {
  message: "SMS text is required when sending SMS",
  path: ["smsText"],
});

type FormValues = z.infer<typeof formSchema>;

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  email_subject?: string;
  email_html_body?: string;
  sms_text?: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

interface RecipientCounts {
  emailCount: number;
  smsCount: number;
}

const Campaigns = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('create');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      emailSubject: '',
      emailBody: '',
      smsText: '',
      sendEmail: false,
      sendSms: false,
      testEmail: '',
      testPhone: '',
    },
  });

  // Watch form values for character count and preview
  const watchedValues = form.watch();
  const smsCharCount = watchedValues.smsText?.length || 0;
  const getSmsWarning = () => {
    if (smsCharCount <= 160) return { color: 'text-green-600', message: '1 SMS' };
    if (smsCharCount <= 320) return { color: 'text-yellow-600', message: '2 SMS' };
    if (smsCharCount <= 480) return { color: 'text-orange-600', message: '3 SMS' };
    return { color: 'text-red-600', message: `${Math.ceil(smsCharCount / 160)} SMS` };
  };

  // Fetch recipient counts
  const { data: recipientCounts } = useQuery<RecipientCounts>({
    queryKey: ['recipient-counts'],
    queryFn: async () => {
      const [emailResult, smsResult] = await Promise.all([
        supabase.from('newsletter_subscriptions').select('id', { count: 'exact', head: true }),
        supabase.from('contact_numbers').select('id', { count: 'exact', head: true })
      ]);

      return {
        emailCount: emailResult.count || 0,
        smsCount: smsResult.count || 0
      };
    },
  });

  // Fetch campaigns
  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-campaigns');
      if (error) throw error;
      return data.campaigns || [];
    },
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const campaignType = values.sendEmail && values.sendSms ? 'both' : 
                          values.sendEmail ? 'email' : 'sms';

      const { data, error } = await supabase.functions.invoke('create-campaign', {
        body: {
          name: values.name,
          type: campaignType,
          emailSubject: values.emailSubject,
          emailBody: values.emailBody,
          smsText: values.smsText,
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Campaign created successfully",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  // Send test mutation
  const sendTestMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data, error } = await supabase.functions.invoke('send-test-message', {
        body: {
          emailSubject: values.emailSubject,
          emailBody: values.emailBody,
          smsText: values.smsText,
          testEmail: values.testEmail,
          testPhone: values.testPhone,
          sendEmail: values.sendEmail,
          sendSms: values.sendSms,
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Test Sent",
        description: "Test message sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to send test message",
        variant: "destructive",
      });
    },
  });

  // Send campaign mutation
  const sendCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke('send-campaign', {
        body: { campaignId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Campaign Started",
        description: "Campaign is now being sent",
      });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (error: any) => {
      toast({
        title: "Send Failed",
        description: error.message || "Failed to start campaign",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    createCampaignMutation.mutate(values);
  };

  const onSendTest = () => {
    const values = form.getValues();
    if (!values.sendEmail && !values.sendSms) {
      toast({
        title: "Error",
        description: "Please select at least one option (Email or SMS)",
        variant: "destructive",
      });
      return;
    }

    if (values.sendEmail && !values.testEmail) {
      toast({
        title: "Error",
        description: "Test email address is required",
        variant: "destructive",
      });
      return;
    }

    if (values.sendSms && !values.testPhone) {
      toast({
        title: "Error",
        description: "Test phone number is required",
        variant: "destructive",
      });
      return;
    }

    sendTestMutation.mutate(values);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { variant: 'secondary', icon: Clock },
      sending: { variant: 'default', icon: Send },
      completed: { variant: 'success', icon: CheckCircle },
      failed: { variant: 'destructive', icon: XCircle },
    } as any;

    const config = statusMap[status] || statusMap.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    if (type === 'email') return <Mail className="w-4 h-4" />;
    if (type === 'sms') return <MessageSquare className="w-4 h-4" />;
    return (
      <div className="flex gap-1">
        <Mail className="w-3 h-3" />
        <MessageSquare className="w-3 h-3" />
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Email & SMS Campaigns</h1>
            <p className="text-muted-foreground">Create and manage your marketing campaigns</p>
          </div>
          
          {recipientCounts && (
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>{recipientCounts.emailCount} email subscribers</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span>{recipientCounts.smsCount} SMS subscribers</span>
              </div>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="create">Create Campaign</TabsTrigger>
            <TabsTrigger value="campaigns">Campaign History</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Campaign</CardTitle>
                <CardDescription>
                  Design your email and SMS campaign with preview and testing options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Campaign Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter campaign name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <FormField
                              control={form.control}
                              name="sendEmail"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormLabel className="flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    Email Campaign
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="emailSubject"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Subject</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Email subject"
                                    disabled={!watchedValues.sendEmail}
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="emailBody"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>HTML Body</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Enter HTML email content"
                                    rows={8}
                                    disabled={!watchedValues.sendEmail}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <FormField
                              control={form.control}
                              name="sendSms"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormLabel className="flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" />
                                    SMS Campaign
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="smsText"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center justify-between">
                                  <FormLabel>SMS Text</FormLabel>
                                  {watchedValues.sendSms && (
                                    <span className={`text-xs ${getSmsWarning().color}`}>
                                      {smsCharCount}/1600 chars ({getSmsWarning().message})
                                    </span>
                                  )}
                                </div>
                                <FormControl>
                                  <Textarea
                                    placeholder="Enter SMS message (160 chars = 1 SMS)"
                                    rows={8}
                                    disabled={!watchedValues.sendSms}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TestTube className="w-4 h-4" />
                            Test Send
                          </CardTitle>
                          <CardDescription>Send a test message before launching</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {watchedValues.sendEmail && (
                            <FormField
                              control={form.control}
                              name="testEmail"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Test Email Address</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="email"
                                      placeholder="test@example.com"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                          
                          {watchedValues.sendSms && (
                            <FormField
                              control={form.control}
                              name="testPhone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Test Phone Number</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="+254700123456"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            onClick={onSendTest}
                            disabled={sendTestMutation.isPending}
                            className="w-full"
                          >
                            <TestTube className="w-4 h-4 mr-2" />
                            {sendTestMutation.isPending ? 'Sending...' : 'Send Test'}
                          </Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            Preview
                          </CardTitle>
                          <CardDescription>Preview your campaign content</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {watchedValues.sendEmail && watchedValues.emailSubject && (
                            <div>
                              <h4 className="font-medium text-sm">Email Subject:</h4>
                              <p className="text-sm bg-muted p-2 rounded">{watchedValues.emailSubject}</p>
                            </div>
                          )}
                          
                          {watchedValues.sendEmail && watchedValues.emailBody && (
                            <div>
                              <h4 className="font-medium text-sm">Email Preview:</h4>
                              <div 
                                className="text-sm bg-muted p-2 rounded max-h-32 overflow-y-auto"
                                dangerouslySetInnerHTML={{ __html: watchedValues.emailBody }}
                              />
                            </div>
                          )}
                          
                          {watchedValues.sendSms && watchedValues.smsText && (
                            <div>
                              <h4 className="font-medium text-sm">SMS Preview:</h4>
                              <p className="text-sm bg-muted p-2 rounded">{watchedValues.smsText}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        type="submit"
                        disabled={createCampaignMutation.isPending}
                        className="flex-1"
                      >
                        {createCampaignMutation.isPending ? 'Creating...' : 'Create Campaign'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns">
            <Card>
              <CardHeader>
                <CardTitle>Campaign History</CardTitle>
                <CardDescription>View and manage your past campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading campaigns...</div>
                ) : campaigns && campaigns.length > 0 ? (
                  <div className="space-y-4">
                    {campaigns.map((campaign) => (
                      <div key={campaign.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            {getTypeIcon(campaign.type)}
                            <h3 className="font-medium">{campaign.name}</h3>
                            {getStatusBadge(campaign.status)}
                          </div>
                          <div className="flex gap-2">
                            {campaign.status === 'draft' && (
                              <Button
                                size="sm"
                                onClick={() => sendCampaignMutation.mutate(campaign.id)}
                                disabled={sendCampaignMutation.isPending}
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Send
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Recipients:</span> {campaign.total_recipients}
                          </div>
                          <div>
                            <span className="font-medium">Sent:</span> {campaign.sent_count}
                          </div>
                          <div>
                            <span className="font-medium">Failed:</span> {campaign.failed_count}
                          </div>
                          <div>
                            <span className="font-medium">Created:</span> {new Date(campaign.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        
                        {campaign.error_message && (
                          <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                            {campaign.error_message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No campaigns created yet. Create your first campaign above!
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Campaigns;
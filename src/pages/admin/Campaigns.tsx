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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, MessageSquare, Send, Eye, Users, Clock, CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  emailSubject: z.string().optional(),
  emailBody: z.string().optional(),
  smsText: z.string().max(1600, 'SMS text must be 1600 characters or less').optional(),
  sendEmail: z.boolean().default(false),
  sendSms: z.boolean().default(false),
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
  const [sendingCampaigns, setSendingCampaigns] = useState<Set<string>>(new Set());
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      emailSubject: '',
      emailBody: '',
      smsText: '',
      sendEmail: false,
      sendSms: false,
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

  // Fetch campaigns with auto-refresh for sending campaigns
  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      console.log('Fetching campaigns...');
      const { data, error } = await supabase.functions.invoke('get-campaigns');
      if (error) {
        console.error('Error fetching campaigns:', error);
        throw error;
      }
      console.log('Campaigns fetched:', data.campaigns);
      return data.campaigns || [];
    },
    refetchInterval: 2000, // Auto-refresh every 2 seconds to check for status changes
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


  // Update campaign mutation
  const updateCampaignMutation = useMutation({
    mutationFn: async ({ campaignId, values }: { campaignId: string, values: FormValues }) => {
      const campaignType = values.sendEmail && values.sendSms ? 'both' : 
                          values.sendEmail ? 'email' : 'sms';

      const { data, error } = await supabase.functions.invoke('create-campaign', {
        body: {
          campaignId,
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
        description: "Campaign updated successfully",
      });
      setEditingCampaign(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update campaign",
        variant: "destructive",
      });
    },
  });

  // Delete campaign mutation
  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-campaign', {
        body: { campaignId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });
      setCampaignToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete campaign",
        variant: "destructive",
      });
    },
  });
  const sendCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      console.log('Starting campaign send for:', campaignId);
      setSendingCampaigns(prev => new Set([...prev, campaignId]));
      
      const { data, error } = await supabase.functions.invoke('send-campaign', {
        body: { campaignId }
      });

      if (error) {
        console.error('Campaign send error:', error);
        throw error;
      }
      
      console.log('Campaign send response:', data);
      return data;
    },
    onSuccess: (data, campaignId) => {
      console.log('Campaign send successful:', data);
      toast({
        title: "Campaign Started",
        description: `Campaign is now being sent. Sent: ${data.sent || 0}, Failed: ${data.failed || 0}`,
      });
      
      // Remove from sending state
      setSendingCampaigns(prev => {
        const newSet = new Set(prev);
        newSet.delete(campaignId);
        return newSet;
      });
      
      // Invalidate campaigns to refresh the list
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (error: any, campaignId) => {
      console.error('Campaign send failed:', error);
      toast({
        title: "Send Failed",
        description: error.message || "Failed to start campaign",
        variant: "destructive",
      });
      
      // Remove from sending state
      setSendingCampaigns(prev => {
        const newSet = new Set(prev);
        newSet.delete(campaignId);
        return newSet;
      });
      
      // Still refresh to get updated status
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  const onSubmit = (values: FormValues) => {
    if (editingCampaign) {
      updateCampaignMutation.mutate({ campaignId: editingCampaign.id, values });
    } else {
      createCampaignMutation.mutate(values);
    }
  };

  const startEditingCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    
    // Populate form with campaign data
    form.reset({
      name: campaign.name,
      emailSubject: campaign.email_subject || '',
      emailBody: campaign.email_html_body || '',
      smsText: campaign.sms_text || '',
      sendEmail: campaign.type === 'email' || campaign.type === 'both',
      sendSms: campaign.type === 'sms' || campaign.type === 'both',
    });
    
    setActiveTab('create');
  };

  const cancelEditing = () => {
    setEditingCampaign(null);
    form.reset();
  };


  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { variant: 'secondary', icon: Clock, color: 'text-gray-600' },
      sending: { variant: 'default', icon: Send, color: 'text-blue-600' },
      completed: { variant: 'success', icon: CheckCircle, color: 'text-green-600' },
      failed: { variant: 'destructive', icon: XCircle, color: 'text-red-600' },
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
                <CardTitle>{editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}</CardTitle>
                <CardDescription>
                  {editingCampaign 
                    ? `Editing campaign: ${editingCampaign.name}` 
                    : 'Design your email and SMS campaign with preview and testing options'
                  }
                </CardDescription>
                {editingCampaign && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={cancelEditing}>
                      Cancel Edit
                    </Button>
                  </div>
                )}
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

                    <div className="flex justify-center">
                      <Card className="w-full max-w-md">
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

                          {watchedValues.sendEmail && (
                            <div>
                              <h4 className="font-medium text-sm">From:</h4>
                              <p className="text-sm bg-muted p-2 rounded">Lake Victoria Aquaculture &lt;campaigns@lakevictoriaaquaculture.com&gt;</p>
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
                        disabled={editingCampaign ? updateCampaignMutation.isPending : createCampaignMutation.isPending}
                        className="flex-1"
                      >
                        {editingCampaign 
                          ? (updateCampaignMutation.isPending ? 'Updating...' : 'Update Campaign')
                          : (createCampaignMutation.isPending ? 'Creating...' : 'Create Campaign')
                        }
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
                    {campaigns.map((campaign) => {
                      const isSending = sendingCampaigns.has(campaign.id) || campaign.status === 'sending';
                      
                      return (
                        <div key={campaign.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              {getTypeIcon(campaign.type)}
                              <h3 className="font-medium">{campaign.name}</h3>
                              {getStatusBadge(campaign.status)}
                              {isSending && (
                                <div className="flex items-center gap-2 text-sm text-blue-600">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                  <span>Processing...</span>
                                </div>
                              )}
                            </div>
                             <div className="flex gap-2">
                               {campaign.status === 'draft' && (
                                 <>
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     onClick={() => startEditingCampaign(campaign)}
                                   >
                                     <Edit className="w-4 h-4 mr-1" />
                                     Edit
                                   </Button>
                                   <AlertDialog>
                                     <AlertDialogTrigger asChild>
                                       <Button size="sm" variant="destructive">
                                         <Trash2 className="w-4 h-4 mr-1" />
                                         Delete
                                       </Button>
                                     </AlertDialogTrigger>
                                     <AlertDialogContent>
                                       <AlertDialogHeader>
                                         <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                                         <AlertDialogDescription>
                                           Are you sure you want to delete "{campaign.name}"? This action cannot be undone.
                                         </AlertDialogDescription>
                                       </AlertDialogHeader>
                                       <AlertDialogFooter>
                                         <AlertDialogCancel>Cancel</AlertDialogCancel>
                                         <AlertDialogAction 
                                           onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                                           className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                         >
                                           Delete
                                         </AlertDialogAction>
                                       </AlertDialogFooter>
                                     </AlertDialogContent>
                                   </AlertDialog>
                                   <Button
                                     size="sm"
                                     onClick={() => sendCampaignMutation.mutate(campaign.id)}
                                     disabled={sendCampaignMutation.isPending || isSending}
                                   >
                                     <Send className="w-4 h-4 mr-1" />
                                     {isSending ? 'Sending...' : 'Send'}
                                   </Button>
                                 </>
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
                          
                          {campaign.started_at && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              <span className="font-medium">Started:</span> {new Date(campaign.started_at).toLocaleString()}
                            </div>
                          )}
                          
                          {campaign.completed_at && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              <span className="font-medium">Completed:</span> {new Date(campaign.completed_at).toLocaleString()}
                            </div>
                          )}
                          
                          {campaign.error_message && (
                            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                              <span className="font-medium">Error:</span> {campaign.error_message}
                            </div>
                          )}
                        </div>
                      );
                    })}
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

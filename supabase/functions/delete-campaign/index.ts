import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { campaignId } = await req.json()
    
    console.log('Deleting campaign:', campaignId)

    // First check if campaign exists and is in a deletable state
    const { data: campaign, error: fetchError } = await supabaseClient
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (fetchError) {
      console.error('Error fetching campaign:', fetchError)
      throw new Error('Campaign not found')
    }

    // Don't allow deletion of campaigns that are currently sending
    if (campaign.status === 'sending') {
      throw new Error('Cannot delete a campaign that is currently being sent')
    }

    // Delete the campaign
    const { error } = await supabaseClient
      .from('campaigns')
      .delete()
      .eq('id', campaignId)

    if (error) {
      console.error('Error deleting campaign:', error)
      throw error
    }

    console.log('Campaign deleted successfully:', campaignId)

    return new Response(
      JSON.stringify({ success: true, campaignId }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
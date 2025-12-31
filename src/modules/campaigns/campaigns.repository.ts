import { supabase } from '../../libs/supabase.js';
export const getLatestCampaign = async (now) => {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .lte('start_date', now.toISOString())
    .gte('end_date', now.toISOString())
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
};
export const recordCampaignView = async (userId, campaignId) => {
  const { error } = await supabase
    .from('campaign_views')
    .upsert({ user_id: userId, campaign_id: campaignId }, { onConflict: 'user_id,campaign_id' });
  if (error) throw error;
};
export const listCampaigns = async (options = { limit: 10, activeOnly: true }) => {
  let query = supabase.from('campaigns').select('*');

  // Filter active campaigns by default
  if (options.activeOnly) {
    const now = new Date().toISOString();
    query = query.eq('is_active', true).lte('start_date', now).gte('end_date', now);
  }

  query = query.order('start_date', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
};
export const getCampaignById = async (id) => {
  const { data, error } = await supabase.from('campaigns').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
};
export const createCampaign = async (payload) => {
  const { data, error } = await supabase.from('campaigns').insert(payload).select().maybeSingle();
  if (error) throw error;
  return data;
};
export const updateCampaign = async (id, payload) => {
  const { data, error } = await supabase
    .from('campaigns')
    .update(payload)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
};
export const deleteCampaign = async (id) => {
  const { error } = await supabase.from('campaigns').delete().eq('id', id);
  if (error) throw error;
};

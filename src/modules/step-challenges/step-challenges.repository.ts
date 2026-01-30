import { supabase } from '../../libs/supabase.js';

// Type definitions
export interface StepChallengeData {
  name: string;
  description?: string | null;
  machineId?: string | null;
  locationName?: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  badgeThresholds?: BadgeThreshold[];
  createdByAdminId?: string | null;
}

export interface BadgeThreshold {
  steps: number;
  badge_name: string;
  badge_icon: string;
}

export interface StepSubmissionData {
  participantId: string;
  steps: number;
  source?: string;
  deviceInfo?: Record<string, unknown>;
}

export interface UserBadgeData {
  userId: string;
  challengeId?: string | null;
  badgeName: string;
  badgeType: 'steps' | 'ranking' | 'completion';
  badgeIcon?: string;
  stepsAchieved?: number;
}

interface ListFilters {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  machineId?: string;
}

interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Create a new step challenge
 */
export const createChallenge = async (data: StepChallengeData) => {
  const { data: challenge, error } = await supabase
    .from('step_challenges')
    .insert({
      name: data.name,
      description: data.description ?? null,
      machine_id: data.machineId ?? null,
      location_name: data.locationName ?? null,
      location_latitude: data.locationLatitude ?? null,
      location_longitude: data.locationLongitude ?? null,
      start_date: data.startDate,
      end_date: data.endDate,
      is_active: data.isActive ?? true,
      badge_thresholds: data.badgeThresholds ?? [],
      created_by_admin_id: data.createdByAdminId ?? null
    })
    .select()
    .single();

  if (error) throw error;
  return challenge;
};

/**
 * Get challenge by ID
 */
export const getChallengeById = async (id: string) => {
  const { data, error } = await supabase
    .from('step_challenges')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

/**
 * List challenges with filters and pagination
 */
export const listChallenges = async (
  filters: ListFilters = {},
  pagination: PaginationParams = {}
) => {
  const { search, status, machineId } = filters;
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('step_challenges')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  if (status === 'active') {
    query = query.eq('is_active', true);
  } else if (status === 'inactive') {
    query = query.eq('is_active', false);
  }

  if (machineId) {
    query = query.eq('machine_id', machineId);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    challenges: data ?? [],
    meta: {
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit)
    }
  };
};

/**
 * Update challenge
 */
export const updateChallenge = async (id: string, data: Partial<StepChallengeData>) => {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.machineId !== undefined) updateData.machine_id = data.machineId;
  if (data.locationName !== undefined) updateData.location_name = data.locationName;
  if (data.locationLatitude !== undefined) updateData.location_latitude = data.locationLatitude;
  if (data.locationLongitude !== undefined) updateData.location_longitude = data.locationLongitude;
  if (data.startDate !== undefined) updateData.start_date = data.startDate;
  if (data.endDate !== undefined) updateData.end_date = data.endDate;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;
  if (data.badgeThresholds !== undefined) updateData.badge_thresholds = data.badgeThresholds;

  const { data: challenge, error } = await supabase
    .from('step_challenges')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return challenge;
};

/**
 * Delete challenge
 */
export const deleteChallenge = async (id: string) => {
  const { error } = await supabase
    .from('step_challenges')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

/**
 * Toggle challenge active status
 */
export const toggleChallengeStatus = async (id: string) => {
  const challenge = await getChallengeById(id);
  
  const { data, error } = await supabase
    .from('step_challenges')
    .update({
      is_active: !challenge.is_active,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Get active challenges (optionally near a location)
 */
export const getActiveChallenges = async () => {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('step_challenges')
    .select('*')
    .eq('is_active', true)
    .lte('start_date', now)
    .gte('end_date', now)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
};

/**
 * Register user for a challenge
 */
export const registerParticipant = async (challengeId: string, userId: string) => {
  const { data, error } = await supabase
    .from('step_challenge_participants')
    .insert({
      challenge_id: challengeId,
      user_id: userId
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Get participant by challenge and user
 */
export const getParticipant = async (challengeId: string, userId: string) => {
  const { data, error } = await supabase
    .from('step_challenge_participants')
    .select('*')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Get user's active challenge participation
 */
export const getUserActiveParticipation = async (userId: string) => {
  const now = new Date().toISOString();
  
  // Get latest participation with its challenge
  const { data, error } = await supabase
    .from('step_challenge_participants')
    .select(`
      *,
      challenge:step_challenges!inner(*)
    `)
    .eq('user_id', userId)
    .eq('challenge.is_active', true)
    .gt('challenge.end_date', now)
    .order('registered_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Submit steps for a participant
 */
export const submitSteps = async (data: StepSubmissionData) => {
  const { data: submission, error } = await supabase
    .from('step_submissions')
    .insert({
      participant_id: data.participantId,
      steps: data.steps,
      source: data.source ?? null,
      device_info: data.deviceInfo ?? null
    })
    .select()
    .single();

  if (error) throw error;
  return submission;
};

/**
 * Update participant's total steps
 */
export const updateParticipantSteps = async (participantId: string, totalSteps: number) => {
  const { data, error } = await supabase
    .from('step_challenge_participants')
    .update({
      total_steps: totalSteps,
      last_step_update: new Date().toISOString()
    })
    .eq('id', participantId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Get challenge leaderboard using DB function
 */
export const getChallengeLeaderboard = async (challengeId: string, limit: number = 10) => {
  const { data, error } = await supabase.rpc('get_challenge_leaderboard', {
    p_challenge_id: challengeId,
    p_limit: limit
  });

  if (error) throw error;
  return data ?? [];
};

/**
 * Get challenge participants with pagination
 */
export const getChallengeParticipants = async (
  challengeId: string,
  pagination: PaginationParams = {}
) => {
  const { page = 1, limit = 20 } = pagination;
  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('step_challenge_participants')
    .select(`
      id,
      total_steps,
      last_step_update,
      registered_at,
      users (
        id,
        first_name,
        last_name,
        phone_number
      )
    `, { count: 'exact' })
    .eq('challenge_id', challengeId)
    .order('total_steps', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const participants = (data ?? []).map((p: Record<string, unknown>) => ({
    id: p.id,
    total_steps: p.total_steps,
    last_step_update: p.last_step_update,
    registered_at: p.registered_at,
    user: p.users
  }));

  return {
    participants,
    meta: {
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit)
    }
  };
};

/**
 * Get challenge statistics
 */
export const getChallengeStats = async (challengeId: string) => {
  const { data, error } = await supabase
    .from('step_challenge_participants')
    .select('total_steps')
    .eq('challenge_id', challengeId);

  if (error) throw error;

  const participants = data ?? [];
  const totalParticipants = participants.length;
  const totalSteps = participants.reduce((sum, p) => sum + (p.total_steps || 0), 0);
  const averageSteps = totalParticipants > 0 ? Math.round(totalSteps / totalParticipants) : 0;

  return {
    totalParticipants,
    totalSteps,
    averageSteps
  };
};

/**
 * Create user badge
 */
export const createBadge = async (data: UserBadgeData) => {
  const { data: badge, error } = await supabase
    .from('user_badges')
    .insert({
      user_id: data.userId,
      challenge_id: data.challengeId ?? null,
      badge_name: data.badgeName,
      badge_type: data.badgeType,
      badge_icon: data.badgeIcon ?? null,
      steps_achieved: data.stepsAchieved ?? null
    })
    .select()
    .single();

  if (error) throw error;
  return badge;
};

/**
 * Get user's badges
 */
export const getUserBadges = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_badges')
    .select(`
      *,
      challenge:step_challenges(name)
    `)
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
};

/**
 * Check if user has a specific badge for a challenge
 */
export const hasUserBadge = async (userId: string, challengeId: string, badgeName: string) => {
  const { data, error } = await supabase
    .from('user_badges')
    .select('id')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .eq('badge_name', badgeName)
    .maybeSingle();

  if (error) throw error;
  return !!data;
};

/**
 * Award ranking badges (1st, 2nd, 3rd) for a challenge
 */
export const awardRankingBadges = async (challengeId: string) => {
  // 1. Get top 3 participants
  const leaderboard = await getChallengeLeaderboard(challengeId, 3);
  
  if (leaderboard.length === 0) return [];

  const badgeIcons = ['🥇', '🥈', '🥉'];
  const badgeNames = ['1st Place', '2nd Place', '3rd Place'];
  const createdBadges = [];

  for (let i = 0; i < leaderboard.length; i++) {
    const entry = leaderboard[i];
    
    // Check if user already has this specific ranking badge for this challenge
    const hasBadge = await hasUserBadge(entry.user_id, challengeId, badgeNames[i]);
    
    if (!hasBadge) {
      const badge = await createBadge({
        userId: entry.user_id,
        challengeId: challengeId,
        badgeName: badgeNames[i],
        badgeType: 'ranking',
        badgeIcon: badgeIcons[i],
        stepsAchieved: entry.total_steps
      });
      createdBadges.push(badge);
    }
  }

  return createdBadges;
};

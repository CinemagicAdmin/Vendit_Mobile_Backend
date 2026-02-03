import { apiError, ok } from '../../utils/response.js';
import {
  createChallenge,
  getChallengeById,
  listChallenges,
  updateChallenge,
  deleteChallenge,
  toggleChallengeStatus,
  getActiveChallenges,
  registerParticipant,
  getParticipant,
  getUserActiveParticipation,
  submitSteps,
  updateParticipantSteps,
  getChallengeLeaderboard,
  getChallengeParticipants,
  getChallengeStats,
  createBadge,
  getUserBadges,
  hasUserBadge,
  awardRankingBadges,
  type StepChallengeData,
  type BadgeThreshold
} from './step-challenges.repository.js';
import type { StepChallengeCreateInput, StepChallengeUpdateInput, StepSubmissionInput } from './step-challenges.validators.js';

/**
 * Create a new step challenge
 */
export const createStepChallenge = async (adminId: string, data: StepChallengeCreateInput) => {
  const challenge = await createChallenge({
    name: data.name,
    description: data.description,
    machineId: data.machineId,
    locationName: data.locationName,
    locationLatitude: data.locationLatitude,
    locationLongitude: data.locationLongitude,
    startDate: data.startDate,
    endDate: data.endDate,
    isActive: data.isActive,
    badgeThresholds: data.badgeThresholds,
    createdByAdminId: adminId
  });

  return ok(challenge, 'Step challenge created successfully');
};

/**
 * Get step challenge details with stats
 */
export const getStepChallengeDetails = async (id: string) => {
  const challenge = await getChallengeById(id);
  const stats = await getChallengeStats(id);
  const leaderboard = await getChallengeLeaderboard(id, 3); // Top 3

  return ok({
    challenge,
    stats,
    topThree: leaderboard
  }, 'Challenge details retrieved');
};

/**
 * Update step challenge
 */
export const updateStepChallenge = async (id: string, data: StepChallengeUpdateInput) => {
  const updated = await updateChallenge(id, data as Partial<StepChallengeData>);
  return ok(updated, 'Challenge updated successfully');
};

/**
 * Delete step challenge
 */
export const deleteStepChallenge = async (id: string) => {
  await deleteChallenge(id);
  return ok(null, 'Challenge deleted successfully');
};

/**
 * Toggle challenge status
 */
export const toggleStepChallenge = async (id: string) => {
  const updated = await toggleChallengeStatus(id);
  return ok(updated, `Challenge ${updated.is_active ? 'activated' : 'deactivated'} successfully`);
};

/**
 * List challenges with filters
 */
export const listStepChallenges = async (
  filters: { search?: string; status?: 'active' | 'inactive' | 'all'; machineId?: string },
  pagination: { page?: number; limit?: number }
) => {
  const result = await listChallenges(filters, pagination);
  return ok(result, 'Challenges retrieved');
};

/**
 * Get challenge leaderboard
 */
export const getLeaderboard = async (challengeId: string, limit: number = 10) => {
  const leaderboard = await getChallengeLeaderboard(challengeId, limit);
  return ok({ leaderboard }, 'Leaderboard retrieved');
};

/**
 * Get challenge participants
 */
export const getParticipants = async (
  challengeId: string,
  pagination: { page?: number; limit?: number }
) => {
  const result = await getChallengeParticipants(challengeId, pagination);
  return ok(result, 'Participants retrieved');
};

// ============ User-facing functions ============

/**
 * Get active challenges for user
 */
export const getActiveChallengesForUser = async (userId: string) => {
  const challenges = await getActiveChallenges();
  
  // Check if user is already in an active challenge
  const activeParticipation = await getUserActiveParticipation(userId);
  
  return ok({
    challenges,
    currentChallenge: activeParticipation ? {
      challengeId: activeParticipation.challenge_id,
      totalSteps: activeParticipation.total_steps
    } : null
  }, 'Active challenges retrieved');
};

/**
 * Register user for a challenge
 */
export const registerForChallenge = async (challengeId: string, userId: string) => {
  // Check if challenge exists and is active
  const challenge = await getChallengeById(challengeId);
  
  if (!challenge) {
    throw new apiError(404, 'Challenge not found');
  }

  if (!challenge.is_active) {
    throw new apiError(400, 'Challenge is not active');
  }

  const now = new Date();
  if (now < new Date(challenge.start_date)) {
    throw new apiError(400, 'Challenge has not started yet');
  }

  if (now > new Date(challenge.end_date)) {
    throw new apiError(400, 'Challenge has ended');
  }

  // Check if user already registered
  const existing = await getParticipant(challengeId, userId);
  if (existing) {
    throw new apiError(400, 'You are already registered for this challenge');
  }

  // Register (trigger will prevent if already in another active challenge)
  try {
    const participant = await registerParticipant(challengeId, userId);
    return ok({
      participant,
      challenge: {
        id: challenge.id,
        name: challenge.name,
        endDate: challenge.end_date,
        badgeThresholds: challenge.badge_thresholds
      }
    }, 'Successfully registered for challenge');
  } catch (error: unknown) {
    // Handle DB trigger error for single active challenge
    const err = error as { message?: string };
    if (err?.message?.includes('already participating')) {
      throw new apiError(400, 'You are already participating in another active challenge');
    }
    throw error;
  }
};

/**
 * Submit steps and check for badge thresholds
 * 
 * SUPPORTS TWO MODES:
 * 1. ABSOLUTE MODE (isAbsolute: true, default): 
 *    - 'steps' is the TOTAL cumulative steps from health app
 *    - Backend calculates delta = submitted_steps - current_total
 *    - Only the delta is added (prevents duplication)
 *    - If submitted < current, no steps added (prevents going backwards)
 * 
 * 2. INCREMENTAL MODE (isAbsolute: false):
 *    - 'steps' is added directly to the total
 *    - Use ONLY for manual "Add Steps" feature
 */
export const submitUserSteps = async (
  challengeId: string,
  userId: string,
  data: StepSubmissionInput
) => {
  // Get participant
  const participant = await getParticipant(challengeId, userId);
  
  if (!participant) {
    throw new apiError(400, 'You are not registered for this challenge');
  }

  // Validate challenge is still active
  const challenge = await getChallengeById(challengeId);
  const now = new Date();
  
  if (!challenge.is_active || now > new Date(challenge.end_date)) {
    throw new apiError(400, 'Challenge has ended');
  }

  const currentTotal = participant.total_steps || 0;
  let stepsToAdd: number;
  let newTotal: number;
  
  // Determine the submission mode (default to absolute for safety)
  const isAbsolute = data.isAbsolute !== false;
  
  if (isAbsolute) {
    // ABSOLUTE MODE: Calculate delta from cumulative total
    // data.steps = total steps from HealthKit/Health Connect
    
    if (data.steps <= currentTotal) {
      // No new steps to add (could be same sync or device reset)
      // Return current state without error
      const leaderboard = await getChallengeLeaderboard(challengeId, 100);
      const userRank = leaderboard.findIndex((l: { user_id: string }) => l.user_id === userId) + 1;
      
      return ok({
        totalSteps: currentTotal,
        stepsSubmitted: 0,
        currentRank: userRank || null,
        newBadges: [],
        message: 'Already synced. No new steps detected.'
      }, 'Steps already synced');
    }
    
    // Calculate delta (new steps since last sync)
    stepsToAdd = data.steps - currentTotal;
    newTotal = data.steps; // Set to the absolute value from device
  } else {
    // INCREMENTAL MODE: Add steps directly (for manual entry)
    stepsToAdd = data.steps;
    newTotal = currentTotal + data.steps;
  }

  // Record submission with delta
  await submitSteps({
    participantId: participant.id,
    steps: stepsToAdd, // Record actual steps added
    source: data.source,
    deviceInfo: {
      ...data.deviceInfo,
      submissionMode: isAbsolute ? 'absolute' : 'incremental',
      deviceReportedTotal: isAbsolute ? data.steps : undefined,
      previousTotal: currentTotal
    }
  });

  // Update total
  await updateParticipantSteps(participant.id, newTotal);

  // Check for new badges (only thresholds newly reached in this submission)
  const newBadges: { name: string; icon: string; steps: number }[] = [];
  const thresholds = (challenge.badge_thresholds || []) as BadgeThreshold[];
  
  const newlyReachedThresholds = thresholds.filter(
    t => newTotal >= t.steps && currentTotal < t.steps
  );
  
  for (const threshold of newlyReachedThresholds) {
    const hasBadge = await hasUserBadge(userId, challengeId, threshold.badge_name);
    if (!hasBadge) {
      await createBadge({
        userId,
        challengeId,
        badgeName: threshold.badge_name,
        badgeType: 'steps',
        badgeIcon: threshold.badge_icon,
        stepsAchieved: newTotal
      });
      newBadges.push({
        name: threshold.badge_name,
        icon: threshold.badge_icon,
        steps: threshold.steps
      });
    }
  }

  // Get current rank
  const leaderboard = await getChallengeLeaderboard(challengeId, 100);
  const userRank = leaderboard.findIndex((l: { user_id: string }) => l.user_id === userId) + 1;

  return ok({
    totalSteps: newTotal,
    stepsSubmitted: stepsToAdd,
    previousTotal: currentTotal,
    submissionMode: isAbsolute ? 'absolute' : 'incremental',
    currentRank: userRank || null,
    newBadges
  }, 'Steps submitted successfully');
};

/**
 * Get user's challenge progress
 */
export const getUserChallengeProgress = async (challengeId: string, userId: string) => {
  const participant = await getParticipant(challengeId, userId);
  
  if (!participant) {
    throw new apiError(400, 'You are not registered for this challenge');
  }

  const challenge = await getChallengeById(challengeId);
  const leaderboard = await getChallengeLeaderboard(challengeId, 100);
  const userRank = leaderboard.findIndex((l: { user_id: string }) => l.user_id === userId) + 1;
  const badges = await getUserBadges(userId);
  const challengeBadges = badges.filter((b: { challenge_id: string }) => b.challenge_id === challengeId);

  // Calculate next badge threshold
  const thresholds = (challenge.badge_thresholds || []) as BadgeThreshold[];
  const nextThreshold = thresholds
    .filter(t => t.steps > participant.total_steps)
    .sort((a, b) => a.steps - b.steps)[0];

  return ok({
    totalSteps: participant.total_steps,
    currentRank: userRank || null,
    totalParticipants: leaderboard.length,
    badges: challengeBadges,
    nextBadge: nextThreshold ? {
      name: nextThreshold.badge_name,
      icon: nextThreshold.badge_icon,
      stepsRequired: nextThreshold.steps,
      stepsRemaining: nextThreshold.steps - participant.total_steps
    } : null,
    topThree: leaderboard.slice(0, 3)
  }, 'Progress retrieved');
};

/**
 * Get user's badges
 */
export const getUserBadgesList = async (userId: string) => {
  const badges = await getUserBadges(userId);
  return ok({ badges }, 'Badges retrieved');
};

/**
 * Finalize challenge, mark as inactive, and award ranking badges
 */
export const finalizeStepChallenge = async (challengeId: string) => {
  // 0. Check if already inactive
  const current = await getChallengeById(challengeId);
  if (!current.is_active) {
    throw new apiError(400, 'Challenge is already inactive or finalized');
  }

  // 1. Mark challenge as inactive
  const challenge = await updateChallenge(challengeId, { isActive: false });
  
  // 2. Award ranking badges (1st, 2nd, 3rd)
  const awardedBadges = await awardRankingBadges(challengeId);
  
  return ok({
    challenge,
    awardedBadges
  }, 'Challenge finalized and ranking badges awarded');
};


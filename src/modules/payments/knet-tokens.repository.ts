import { supabase as db } from '../../libs/supabase.js';
import { logger } from '../../config/logger.js';

interface SaveKnetTokenInput {
  userId: string;
  tapCustomerId: string;
  tokenId: string;
  lastFour?: string;
  brand?: string;
}

interface KnetToken {
  id: string;
  userId: string;
  tapCustomerId: string;
  tokenId: string;
  lastFour: string | null;
  brand: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Save a KNET token (tok_xxx) for KFAST repeat payments
 */
export const saveKnetToken = async (input: SaveKnetTokenInput): Promise<KnetToken> => {
  const { userId, tapCustomerId, tokenId, lastFour, brand } = input;

  logger.info({ userId, tokenId, tapCustomerId }, 'Saving KNET token');

  const { data, error } = await db
    .from('knet_tokens')
    .insert({
      user_id: userId,
      tap_customer_id: tapCustomerId,
      token_id: tokenId,
      last_four: lastFour ?? null,
      brand: brand ?? null
    })
    .select()
    .single();

  if (error) {
    logger.error({ error, userId, tokenId }, 'Failed to save KNET token');
    throw error;
  }

  logger.info({ userId, tokenId }, 'KNET token saved successfully');

  return {
    id: data.id,
    userId: data.user_id,
    tapCustomerId: data.tap_customer_id,
    tokenId: data.token_id,
    lastFour: data.last_four,
    brand: data.brand,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

/**
 * List all saved KNET tokens for a user
 */
export const listKnetTokens = async (userId: string): Promise<KnetToken[]> => {
  logger.info({ userId }, 'Listing KNET tokens');

  const { data, error } = await db
    .from('knet_tokens')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ error, userId }, 'Failed to list KNET tokens');
    throw error;
  }

  return (data || []).map((token) => ({
    id: token.id,
    userId: token.user_id,
    tapCustomerId: token.tap_customer_id,
    tokenId: token.token_id,
    lastFour: token.last_four,
    brand: token.brand,
    createdAt: token.created_at,
    updatedAt: token.updated_at
  }));
};

/**
 * Get a specific KNET token
 */
export const getKnetToken = async (
  userId: string,
  tokenId: string
): Promise<KnetToken | null> => {
  logger.info({ userId, tokenId }, 'Getting KNET token');

  const { data, error } = await db
    .from('knet_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('token_id', tokenId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    logger.error({ error, userId, tokenId }, 'Failed to get KNET token');
    throw error;
  }

  return {
    id: data.id,
    userId: data.user_id,
    tapCustomerId: data.tap_customer_id,
    tokenId: data.token_id,
    lastFour: data.last_four,
    brand: data.brand,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

/**
 * Delete a KNET token
 */
export const deleteKnetToken = async (userId: string, tokenId: string): Promise<boolean> => {
  logger.info({ userId, tokenId }, 'Deleting KNET token');

  const { error } = await db
    .from('knet_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('token_id', tokenId);

  if (error) {
    logger.error({ error, userId, tokenId }, 'Failed to delete KNET token');
    throw error;
  }

  logger.info({ userId, tokenId }, 'KNET token deleted successfully');
  return true;
};

/**
 * Check if a user has any saved KNET tokens
 */
export const hasKnetTokens = async (userId: string): Promise<boolean> => {
  const { count, error } = await db
    .from('knet_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    logger.error({ error, userId }, 'Failed to check KNET tokens');
    throw error;
  }

  return (count ?? 0) > 0;
};

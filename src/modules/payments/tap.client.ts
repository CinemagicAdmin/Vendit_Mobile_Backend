import axios, { AxiosError } from 'axios';
import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import { getConfig } from '../../config/env.js';
import { logger } from '../../config/logger.js';

const config = getConfig();

// Create Tap axios instance with retry configuration
const tap = axios.create({
  baseURL: config.tapApiBaseUrl,
  headers: {
    Authorization: `Bearer ${config.tapSecretKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  timeout: 15000
});

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
};

// Helper: exponential backoff with jitter
const calculateDelay = (attempt: number): number => {
  const delay = Math.min(
    RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
    RETRY_CONFIG.maxDelayMs
  );
  return delay + Math.random() * 100; // Add jitter
};

// Helper: check if error is retryable
const isRetryable = (error: AxiosError): boolean => {
  if (!error.response) return true; // Network error
  return RETRY_CONFIG.retryableStatuses.includes(error.response.status);
};

// Retry wrapper for Tap API calls
const withRetry = async <T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      if (!isRetryable(error) || attempt === RETRY_CONFIG.maxRetries - 1) {
        logger.error({
          context,
          attempt: attempt + 1,
          status: error.response?.status,
          error: error.response?.data || error.message
        }, `Tap API failed: ${context}`);
        throw error;
      }
      
      const delay = calculateDelay(attempt);
      logger.warn({
        context,
        attempt: attempt + 1,
        delay,
        status: error.response?.status
      }, `Tap API retry: ${context}`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Generate idempotency key
const generateIdempotencyKey = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${randomUUID().slice(0, 8)}`;
};

export const tapCreateCustomer = async (payload) => {
  const body = {
    first_name: payload.firstName,
    last_name: payload.lastName,
    email: payload.email,
    phone: {
      country_code: config.tapCountryCode,
      number: payload.phone
    },
    description: 'Vend-IT customer',
    metadata: { user_id: payload.userId },
    currency: config.tapDefaultCurrency
  };
  
  return withRetry(async () => {
    const { data } = await tap.post('/customers', body);
    logger.info({ customerId: data.id, userId: payload.userId }, 'Tap customer created');
    return data;
  }, 'createCustomer');
};

export const tapCreateCardToken = async (card) => {
  const body = {
    card: {
      number: Number(card.number),
      exp_month: card.expMonth,
      exp_year: card.expYear,
      cvc: Number(card.cvc),
      name: card.name,
      address: {
        country: 'Kuwait',
        line1: 'Salmiya, 21',
        city: 'Kuwait City',
        street: 'Salim',
        avenue: 'Gulf'
      }
    },
    client_ip: '127.0.0.1'
  };
  
  return withRetry(async () => {
    const { data } = await tap.post('/tokens', body);
    logger.info({ tokenId: data.id, brand: data.card?.brand }, 'Tap card token created');
    return data;
  }, 'createCardToken');
};

export const tapCreateSavedCardToken = async (payload) => {
  const body = {
    saved_card: {
      card_id: payload.cardId,
      customer_id: payload.customerId
    },
    client_ip: '127.0.0.1'
  };
  
  return withRetry(async () => {
    const { data } = await tap.post('/tokens', body);
    logger.info({ tokenId: data.id }, 'Tap saved card token created');
    return data;
  }, 'createSavedCardToken');
};

export const tapCreateCharge = async (payload) => {
  const idempotencyKey = generateIdempotencyKey('chg');
  const body = {
    amount: payload.amount,
    currency: payload.currency,
    customer_initiated: true,
    threeDSecure: true,
    save_card: true,
    reference: { order: payload.orderRef },
    description: 'Vend-IT vending purchase',
    customer: { id: payload.customerId },
    source: { id: payload.sourceId },
    metadata: { idempotency_key: idempotencyKey },
    post: { url: process.env.TAP_WEBHOOK_URL || 'https://vendit.example.com/hooks/tap/post' },
    redirect: { url: process.env.TAP_REDIRECT_URL || 'https://vendit.example.com/hooks/tap/redirect' }
  };
  
  return withRetry(async () => {
    const { data } = await tap.post('/charges', body, {
      headers: { 'Idempotency-Key': idempotencyKey }
    });
    logger.info({
      chargeId: data.id,
      status: data.status,
      amount: payload.amount,
      idempotencyKey
    }, 'Tap charge created');
    return data;
  }, 'createCharge');
};

export const tapCreateChargeWithToken = async (payload) => {
  const idempotencyKey = generateIdempotencyKey('chg_tok');
  const body = {
    amount: payload.amount,
    currency: payload.currency,
    customer_initiated: true,
    threeDSecure: true,
    save_card: false,
    reference: { order: payload.orderRef },
    description: 'Vend-IT payment',
    customer: { 
      first_name: payload.firstName, 
      email: payload.email,
      phone: payload.phone ? {
        country_code: '965',
        number: payload.phone
      } : undefined
    },
    source: { id: payload.tokenId },
    metadata: { idempotency_key: idempotencyKey },
    post: { url: process.env.TAP_WEBHOOK_URL || 'https://vendit.example.com/hooks/tap/post' },
    redirect: { url: process.env.TAP_REDIRECT_URL || 'https://vendit.example.com/hooks/tap/redirect' }
  };
  
  return withRetry(async () => {
    const { data } = await tap.post('/charges', body, {
      headers: { 'Idempotency-Key': idempotencyKey }
    });
    logger.info({
      chargeId: data.id,
      status: data.status,
      paymentMethod: data.source?.payment_method,
      amount: payload.amount,
      idempotencyKey
    }, 'Tap token charge created');
    return data;
  }, 'createChargeWithToken');
};

export const tapCreateGPayToken = async (payload) => {
  // Normalize payment method type for Tap API
  let type = payload.paymentMethodType?.toLowerCase() ?? 'applepay';
  
  if (type === 'apple_pay' || type === 'apple-pay' || type === 'apple') {
    type = 'applepay';
  } else if (type === 'google_pay' || type === 'google-pay' || type === 'google' || type === 'gpay') {
    type = 'googlepay';
  }
  
  const body = {
    type,
    token_data: payload.tokenData,
    client_ip: '127.0.0.1'
  };
  
  return withRetry(async () => {
    const { data } = await tap.post('/tokens', body);
    logger.info({ tokenId: data.id, type }, 'Tap GPay/Apple token created');
    return data;
  }, 'createGPayToken');
};

export const tapListCards = async (customerId) => {
  return withRetry(async () => {
    const { data } = await tap.get(`/card/${customerId}`);
    return data?.data ?? [];
  }, 'listCards');
};

export const tapDeleteCard = async (customerId, cardId) => {
  return withRetry(async () => {
    const { data } = await tap.delete(`/card/${customerId}/${cardId}`);
    logger.info({ customerId, cardId }, 'Tap card deleted');
    return data?.deleted ?? false;
  }, 'deleteCard');
};

// Webhook signature validation
export const validateTapWebhookSignature = (
  payload: string,
  signature: string,
  secret?: string
): boolean => {
  const webhookSecret = secret || config.tapWebhookSecret;
  if (!webhookSecret) {
    logger.warn('Tap webhook secret not configured, skipping validation');
    return true;
  }
  
  try {
    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');
    
    const isValid = timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
    
    if (!isValid) {
      logger.warn({ signature: signature.slice(0, 10) + '...' }, 'Invalid Tap webhook signature');
    }
    
    return isValid;
  } catch (error) {
    logger.error({ error }, 'Webhook signature validation error');
    return false;
  }
};

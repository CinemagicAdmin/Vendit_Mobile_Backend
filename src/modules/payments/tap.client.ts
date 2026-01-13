import axios from 'axios';
import { getConfig } from '../../config/env.js';
const config = getConfig();
const tap = axios.create({
  baseURL: config.tapApiBaseUrl,
  headers: {
    Authorization: `Bearer ${config.tapSecretKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  timeout: 10000
});
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
  const { data } = await tap.post('/customers', body);
  return data;
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
  const { data } = await tap.post('/tokens', body);
  return data;
};
export const tapCreateSavedCardToken = async (payload) => {
  const body = {
    saved_card: {
      card_id: payload.cardId,
      customer_id: payload.customerId
    },
    client_ip: '127.0.0.1'
  };
  const { data } = await tap.post('/tokens', body);
  return data;
};
export const tapCreateCharge = async (payload) => {
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
    post: { url: process.env.TAP_WEBHOOK_URL || 'https://vendit.example.com/hooks/tap/post' },
    redirect: { url: process.env.TAP_REDIRECT_URL || 'https://vendit.example.com/hooks/tap/redirect' }
  };
  const { data } = await tap.post('/charges', body);
  return data;
};
export const tapCreateChargeWithToken = async (payload) => {
  const body = {
    amount: payload.amount,
    currency: payload.currency,
    customer_initiated: true,
    threeDSecure: true, // Required for Apple Pay and Google Pay
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
    post: { url: process.env.TAP_WEBHOOK_URL || 'https://vendit.example.com/hooks/tap/post' },
    redirect: { url: process.env.TAP_REDIRECT_URL || 'https://vendit.example.com/hooks/tap/redirect' }
  };
  
  try {
    const { data } = await tap.post('/charges', body);
    
    // Log charge response for debugging
    console.log('Tap charge response:', {
      id: data.id,
      status: data.status,
      source: data.source?.payment_method,
      transaction: data.transaction?.authorization_id
    });
    
    return data;
  } catch (error: any) {
    const errDetails = {
      status: error.response?.status,
      data: error.response?.data,
      tokenId: payload.tokenId,
      amount: payload.amount
    };
    console.error('Tap charge creation failed:', errDetails);
    throw error;
  }
};
export const tapCreateGPayToken = async (payload) => {
  // Normalize payment method type for Tap API
  // Tap expects lowercase: 'applepay', 'googlepay', etc.
  let type = payload.paymentMethodType?.toLowerCase() ?? 'applepay';
  
  // Map common variations to Tap-expected values
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
  
  try {
    const { data } = await tap.post('/tokens', body);
    return data;
  } catch (error: any) {
    // Log detailed error for debugging
    const errDetails = {
      status: error.response?.status,
      data: error.response?.data,
      type,
      hasTokenData: !!payload.tokenData
    };
    console.error('Tap token creation failed:', errDetails);
    throw error;
  }
};
export const tapListCards = async (customerId) => {
  const { data } = await tap.get(`/card/${customerId}`);
  return data?.data ?? [];
};
export const tapDeleteCard = async (customerId, cardId) => {
  const { data } = await tap.delete(`/card/${customerId}/${cardId}`);
  return data?.deleted ?? false;
};

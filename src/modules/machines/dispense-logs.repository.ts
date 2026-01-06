import { supabase } from '../../libs/supabase.js';

interface CreateDispenseLogPayload {
  paymentId: string;
  machineId: string;
  slotNumber: string;
  productId?: string;
  status: 'pending' | 'sent' | 'confirmed' | 'failed';
}

interface UpdateDispenseLogPayload {
  status?: 'pending' | 'sent' | 'confirmed' | 'failed';
  errorMessage?: string;
  websocketResponse?: any;
  attemptCount?: number;
}

export const createDispenseLog = async (payload: CreateDispenseLogPayload) => {
  const { data, error } = await supabase
    .from('dispense_logs')
    .insert({
      payment_id: payload.paymentId,
      machine_id: payload.machineId,
      slot_number: payload.slotNumber,
      product_id: payload.productId ?? null,
      status: payload.status
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateDispenseLog = async (logId: string, updates: UpdateDispenseLogPayload) => {
  const { error } = await supabase
    .from('dispense_logs')
    .update({
      ...(updates.status && { status: updates.status }),
      ...(updates.errorMessage && { error_message: updates.errorMessage }),
      ...(updates.websocketResponse && { websocket_response: updates.websocketResponse }),
      ...(updates.attemptCount && { attempt_count: updates.attemptCount }),
      updated_at: new Date().toISOString()
    })
    .eq('id', logId);

  if (error) throw error;
};

export const getDispenseLogsByPayment = async (paymentId: string) => {
  const { data, error } = await supabase
    .from('dispense_logs')
    .select('*')
    .eq('payment_id', paymentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
};

export const getDispenseLogById = async (logId: string) => {
  const { data, error } = await supabase
    .from('dispense_logs')
    .select('*')
    .eq('id', logId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

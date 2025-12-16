import { supabase } from '../../libs/supabase.js';

export const STATIC_CONTENT_KEYS = {
  privacyPolicy: 'privacy_policy',
  termsAndConditions: 'terms_conditions',
  faq: 'faq'
};

export const mapStaticContentResponse = (rows) => {
  if (!rows?.length) return null;
  const byKey = rows.reduce((acc, row) => {
    if (!row?.key) return acc;
    acc[row.key] = row;
    return acc;
  }, {});
  const updatedAt = rows.reduce((latest, row) => {
    if (!row?.updated_at) return latest;
    if (!latest) return row.updated_at;
    return new Date(row.updated_at) > new Date(latest) ? row.updated_at : latest;
  }, null);
  const rawId = byKey[STATIC_CONTENT_KEYS.privacyPolicy]?.id ?? rows[0].id ?? null;
  const id = rawId !== null && rawId !== undefined ? String(rawId) : null;
  return {
    id,
    privacy_policy: byKey[STATIC_CONTENT_KEYS.privacyPolicy]?.content ?? null,
    terms_and_conditions:
      byKey[STATIC_CONTENT_KEYS.termsAndConditions]?.content ??
      byKey.terms_and_conditions?.content ??
      null,
    faq: byKey[STATIC_CONTENT_KEYS.faq]?.content ?? null,
    updated_at: updatedAt ?? null
  };
};

export const getStaticContent = async () => {
  const { data, error } = await supabase
    .from('static_content')
    .select('id,key,content,updated_at')
    .in('key', Object.values(STATIC_CONTENT_KEYS));
  if (error) throw error;
  return mapStaticContentResponse(data ?? []);
};

export const upsertStaticContent = async (payload) => {
  const rowsToUpsert = [];
  const now = new Date().toISOString();
  if (payload.privacyPolicy !== undefined) {
    rowsToUpsert.push({
      key: STATIC_CONTENT_KEYS.privacyPolicy,
      content: payload.privacyPolicy ?? null,
      updated_at: now
    });
  }
  if (payload.termsAndConditions !== undefined) {
    rowsToUpsert.push({
      key: STATIC_CONTENT_KEYS.termsAndConditions,
      content: payload.termsAndConditions ?? null,
      updated_at: now
    });
  }
  if (payload.faq !== undefined) {
    rowsToUpsert.push({
      key: STATIC_CONTENT_KEYS.faq,
      content: payload.faq ?? null,
      updated_at: now
    });
  }
  if (!rowsToUpsert.length) {
    return getStaticContent();
  }
  const { error } = await supabase
    .from('static_content')
    .upsert(rowsToUpsert, { onConflict: 'key' });
  if (error) throw error;
  return getStaticContent();
};
export const createContactMessage = async (payload) => {
  const { error } = await supabase.from('contact_us').insert({
    user_id: payload.userId,
    email: payload.email,
    subject: payload.subject,
    message: payload.message
  });
  if (error) throw error;
};
export const listContactMessages = async () => {
  const { data, error } = await supabase
    .from('contact_us')
    .select(
      `
      id,
      email,
      subject,
      message,
      created_at,
      user:users!contact_us_user_id_fkey(first_name, last_name, phone_number)
    `
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
};

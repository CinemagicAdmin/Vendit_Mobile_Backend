import { supabase } from '../../../libs/supabase.js';

/**
 * Sum all captured payments for total revenue
 */
const sumPayments = async (): Promise<number> => {
  const { data, error } = await supabase.from('payments').select('amount').eq('status', 'CAPTURED');

  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
};

/**
 * Get dashboard metrics
 */
export const getDashboardMetrics = async () => {
  const [totalUsers, activeUsers, totalRevenue, totalOrders, activeMachines] = await Promise.all([
    supabase.from('users').select('id', { head: true, count: 'exact' }),
    supabase.from('users').select('id', { head: true, count: 'exact' }).eq('status', 1),
    sumPayments(),
    supabase.from('payments').select('id', { head: true, count: 'exact' }).eq('status', 'CAPTURED'),
    supabase.from('machines').select('u_id', { head: true, count: 'exact' })
  ]);

  return {
    totalUsers: totalUsers.count ?? 0,
    activeUsers: activeUsers.count ?? 0,
    totalRevenue: totalRevenue,
    totalOrders: totalOrders.count ?? 0,
    activeMachines: activeMachines.count ?? 0
  };
};

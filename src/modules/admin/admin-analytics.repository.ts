import { supabase } from '../../libs/supabase.js';

/**
 * Get sales trends over time
 * @param period - Time period: 7d, 30d, 90d, 1y
 */
export const getSalesTrends = async (period: string = '30d') => {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('payments')
    .select('created_at, amount, status')
    .gte('created_at', startDate.toISOString())
    .eq('status', 'CAPTURED')
    .order('created_at', { ascending: true})
    .limit(5000); // Prevent excessive data transfer

  if (error) throw error;

  // Group by date
  const grouped = (data || []).reduce((acc: any, payment: any) => {
    const date = new Date(payment.created_at).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { revenue: 0, orders: 0 };
    }
    acc[date].revenue += Number(payment.amount || 0);
    acc[date].orders += 1;
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort();
  const revenue = dates.map(date => grouped[date].revenue);
  const orders = dates.map(date => grouped[date].orders);

  return { dates, revenue, orders };
};

/**
 * Get user growth metrics
 * @param period - Time period in days
 */
export const getUserGrowth = async (period: string = '30d') => {
  const days = period === '30d' ? 30 : period === '90d' ? 90 : 365;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('users')
    .select('created_at')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true })
    .limit(10000); // Reasonable limit for user growth

  if (error) throw error;

  // Group by date
  const grouped = (data || []).reduce((acc: any, user: any) => {
    const date = new Date(user.created_at).toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort();
  const newUsers = dates.map(date => grouped[date]);
  
  // Calculate cumulative total
  let total = 0;
  const totalUsers = newUsers.map(count => {
    total += count;
    return total;
  });

  return { dates, newUsers, totalUsers };
};

/**
 * Get top performing products
 * @param limit - Number of products to return
 */
export const getProductPerformance = async (limit: number = 10) => {
  // Limit query to recent payment_products for performance
  // Fetching last 50k records should cover most use cases
  const { data, error } = await supabase
    .from('payment_products')
    .select(`
      product_u_id,
      quantity,
      product:product_u_id (
        description,
        brand_name,
        unit_price
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50000); // Limit to recent 50k payment products

  if (error) throw error;

  // Aggregate by product
  const aggregated = (data || []).reduce((acc: any, item: any) => {
    const productId = item.product_u_id;
    if (!acc[productId]) {
      acc[productId] = {
        id: productId,
        name: item.product?.description || item.product?.brand_name || 'Unknown',
        sales: 0,
        revenue: 0,
      };
    }
    acc[productId].sales += item.quantity || 0;
    acc[productId].revenue += (item.quantity || 0) * Number(item.product?.unit_price || 0);
    return acc;
  }, {});

  // Sort by revenue and take top N
  const products = Object.values(aggregated)
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, limit);

  return products;
};

/**
 * Get machine utilization stats
 */
export const getMachineUtilization = async () => {
  const { data, error } = await supabase
    .from('machines')
    .select('machine_operation_state');

  if (error) throw error;

  const stats = (data || []).reduce(
    (acc: any, machine: any) => {
      const state = machine.machine_operation_state?.toLowerCase() || 'unknown';
      if (state === 'active' || state === 'online') {
        acc.active += 1;
      } else if (state === 'inactive' || state === 'offline') {
        acc.inactive += 1;
      } else if (state === 'maintenance') {
        acc.maintenance += 1;
      } else {
        acc.unknown += 1;
      }
      return acc;
    },
    { active: 0, inactive: 0, maintenance: 0, unknown: 0 }
  );

  return stats;
};

/**
 * Get order status breakdown
 */
export const getOrderStatusBreakdown = async () => {
  const { data, error } = await supabase
    .from('payments')
    .select('status');

  if (error) throw error;

  const breakdown = (data || []).reduce(
    (acc: any, payment: any) => {
      const status = payment.status?.toLowerCase() || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {}
  );

  return breakdown;
};

import { apiError } from '../../utils/response.js';
import {
  getDashboardMetrics,
  listUsers,
  removeUser,
  setUserStatus,
  getUserProfile,
  getUserPayments,
  listMachines,
  listMachineProducts,
  getProduct,
  listProducts,
  listOrders,
  getOrder,
  listOrderProducts,
  listFeedback
} from './admin.repository.js';
const formatUser = (user) => ({
  id: user.id,
  name: [user.first_name, user.last_name].filter(Boolean).join(' '),
  email: user.email,
  phone: user.phone_number,
  country: user.country,
  dob: user.dob,
  avatar: user.user_profile,
  isOtpVerified: Boolean(user.is_otp_verify),
  status: user.status,
  createdAt: user.created_at
});
const unwrapSingle = (value) => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value ?? undefined;
};
export const getAdminDashboard = async () => getDashboardMetrics();
export const getAdminUsers = async (params?: {
  page?: number;
  limit?: number;
  status?: number;
  search?: string;
}) => {
  const result = await listUsers(params);
  return {
    users: result.data.map(formatUser),
    meta: result.meta
  };
};
export const deleteAdminUser = async (userId) => {
  await removeUser(userId);
};
export const toggleUserStatus = async (userId, status) => {
  await setUserStatus(userId, status);
};
export const getAdminUserDetails = async (userId) => {
  const profile = await getUserProfile(userId);
  if (!profile) throw new apiError(404, 'User not found');
  const purchases = await getUserPayments(userId);
  const wallet = unwrapSingle(profile?.wallet);
  const loyalty = unwrapSingle(profile?.loyalty);
  const walletBalance = Number(wallet?.balance ?? 0);
  const loyaltyPoints = Number(loyalty?.points ?? 0);
  return {
    user: {
      ...formatUser(profile),
      wallet: walletBalance,
      loyalty: loyaltyPoints
    },
    history: purchases
  };
};
export const getAdminMachines = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) => {
  const result = await listMachines(params);
  return {
    machines: result.data.map((machine) => ({
      machine_u_id: machine.u_id,
      machine_name: machine.machine_tag,
      location: machine.location_address,
      status: machine.machine_operation_state || 'unknown'
    })),
    meta: result.meta
  };
};
export const getAdminMachineProducts = async (machineUId) => {
  const slots = await listMachineProducts(machineUId);
  return slots.map((slot) => ({
    slot: slot.slot_number,
    quantity: slot.quantity,
    maxQuantity: slot.max_quantity,
    product: (() => {
      const product = unwrapSingle(slot?.product);
      if (!product) return null;
      const rawCategory = unwrapSingle(product.category);
      return {
        id: product.product_u_id,
        description: product.description,
        image: product.product_image_url,
        brand: product.brand_name,
        category: rawCategory?.category_name ?? 'Uncategorised'
      };
    })()
  }));
};
export const getAdminProduct = async (productId) => {
  const product = await getProduct(productId);
  if (!product) throw new apiError(404, 'Product not found');
  return product;
};
export const getAdminProducts = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const result = await listProducts(params);
  return {
    products: result.data.map((item) => {
      const product = unwrapSingle(item.product);
      const categoryData = unwrapSingle(product?.category);
      return {
        product_u_id: product?.product_u_id || '',
        description: product?.description || 'N/A',
        brand_name: product?.brand_name || 'N/A',
        image: product?.product_image_url || null,
        category: categoryData?.category_name || 'Uncategorized'
      };
    }),
    meta: result.meta
  };
};
export const getAdminOrders = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  userId?: string;
}) => {
  const result = await listOrders(params);
  return {
    orders: result.data.map((order) => {
      const user = unwrapSingle(order.user);
      const machine = unwrapSingle(order.machine);
      const userName = user
        ? [user.first_name, user.last_name].filter(Boolean).join(' ')
        : 'Unknown';

      return {
        order_id: order.id,
        order_reference: order.order_reference || `ORD-${order.id.slice(0, 8).toUpperCase()}`,
        user_name: userName,
        user_email: user?.email || null,
        user_phone: user?.phone_number || null,
        machine_tag: machine?.machine_tag || 'N/A',
        machine_location: machine?.location_address || 'N/A',
        total_amount: order.amount,
        payment_method: order.payment_method || 'N/A',
        status: order.status || 'pending',
        transaction_id: order.transaction_id || null,
        created_at: order.created_at
      };
    }),
    meta: result.meta
  };
};
export const getAdminOrder = async (orderId) => {
  const order = await getOrder(orderId);
  if (!order) throw new apiError(404, 'Order not found');
  const items = await listOrderProducts(orderId);
  
  const user = unwrapSingle(order.user);
  const machine = unwrapSingle(order.machine);
  
  return {
    order_id: order.id,
    order_reference: order.order_reference || `ORD-${order.id.slice(0, 8).toUpperCase()}`,
    user_name: user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : 'Guest',
    user_email: user?.email || null,
    user_phone: user?.phone_number || null,
    user_avatar: user?.user_profile || null,
    machine_tag: machine?.machine_tag || 'N/A',
    machine_location: machine?.location_address || 'N/A',
    machine_image: machine?.machine_image_url || null,
    total_amount: order.amount,
    payment_method: order.payment_method || 'N/A',
    status: order.status || 'pending',
    currency: order.currency || 'KWD',
    transaction_id: order.transaction_id || null,
    charge_id: order.charge_id || null,
    earned_points: order.earned_points || 0,
    redeemed_points: order.redeemed_points || 0,
    redeemed_amount: order.redeemed_amount || 0,
    created_at: order.created_at,
    items: items.map((item) => {
      const product = unwrapSingle(item.product);
      return {
        product_id: product?.product_u_id || '',
        product_name: product?.description || 'Unknown Product',
        product_image: product?.product_image_url || null,
        quantity: item.quantity || 1,
        dispensed_quantity: item.dispensed_quantity || 0,
        price: product?.cost_price || 0
      };
    })
  };
};
export const getAdminFeedback = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const result = await listFeedback(params);
  return {
    feedback: result.data.map((item) => {
      const user = unwrapSingle(item.user);
      return {
        id: item.id,
        user_name: user?.email || user?.phone_number || 'Anonymous',
        message: item.message,
        rating: null, // Add if rating field exists
        created_at: item.created_at
      };
    }),
    meta: result.meta
  };
};

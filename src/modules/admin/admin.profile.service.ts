import path from 'node:path';
import { nanoid } from 'nanoid';
import { supabase } from '../../libs/supabase.js';
import { apiError, ok } from '../../utils/response.js';
import {
  createCategory,
  getAdminById,
  getCategoryById,
  listCategories,
  updateAdminProfileInDb,
  updateCategory
} from './admin.profile.repository.js';
const ADMIN_BUCKET = 'admin';

const buildAdminAvatarUrl = (avatarPath) => {
  if (!avatarPath) return null;
  const supabaseUrl = process.env.SUPABASE_URL ?? '';
  return `${supabaseUrl}/storage/v1/object/public/admin/${avatarPath}`;
};
const uploadFile = async ({ bucket, file, prefix }) => {
  if (!file) return null;
  const ext = path.extname(file.originalname) || '.png';
  const objectKey = `${prefix}-${nanoid(8)}${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(objectKey, file.buffer, {
    contentType: file.mimetype,
    upsert: true
  });
  if (error) throw new apiError(400, 'File upload failed', error.message);
  return objectKey;
};
export const getAdminProfile = async (adminId) => {
  const admin = await getAdminById(adminId);
  if (!admin) throw new apiError(404, 'Admin not found');
  return ok(
    { ...admin, avatar_url: buildAdminAvatarUrl(admin.avatar_path ?? null) },
    'Profile fetched'
  );
};
export const updateAdminProfile = async (adminId, payload) => {
  const admin = await getAdminById(adminId);
  if (!admin) throw new apiError(404, 'Admin not found');

  let avatarPath = admin.avatar_path ?? null;
  if (payload.file) {
    avatarPath = await uploadFile({
      bucket: ADMIN_BUCKET,
      file: payload.file,
      prefix: adminId
    });
  }

  const updated = await updateAdminProfileInDb(adminId, {
    name: payload.name,
    avatarPath
  });
  return ok(
    { ...updated, avatar_url: buildAdminAvatarUrl(updated?.avatar_path ?? null) },
    'Profile updated'
  );
};
export const getAdminCategories = async () => {
  const rows = await listCategories();
  return rows.map((row) => ({
    id: row.id,
    name: row.category_name,
    description: row.description,
    created_at: row.created_at
  }));
};

export const getAdminCategoryById = async (id: string) => {
  const category = await getCategoryById(id);
  if (!category) throw new apiError(404, 'Category not found');
  return {
    id: category.id,
    name: category.category_name,
    description: category.description,
    status: 1 // Categories are always active
  };
};

export const getAdminCategoryProducts = async (categoryId: string) => {
  // Query products table filtered by category_id
  const { data, error } = await supabase
    .from('products')
    .select('id, product_name, price, stock, status')
    .eq('category_id', categoryId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.product_name,
    price: p.price,
    stock: p.stock,
    status: p.status
  }));
};
export const createAdminCategory = async (payload) => {
  // Icon upload temporarily disabled - icon_path column doesn't exist
  const category = await createCategory({
    name: payload.name,
    description: payload.description
  });
  return ok(category, 'Category created');
};
export const updateAdminCategory = async (id, payload) => {
  const existing = await getCategoryById(id);
  if (!existing) throw new apiError(404, 'Category not found');

  // Icon upload temporarily disabled - icon_path column doesn't exist
  const updated = await updateCategory(id, {
    name: payload.name,
    description: payload.description
  });
  return ok(updated, 'Category updated');
};

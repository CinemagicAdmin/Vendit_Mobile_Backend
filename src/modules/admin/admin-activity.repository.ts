import { supabase } from '../../libs/supabase.js';

// Using existing audit_logs table
export const listActivityLogs = async (params?: {
  page?: number;
  limit?: number;
  admin_id?: string;
  startDate?: string;
  endDate?: string;
  action?: string;
  entityType?: string;
}) => {
  const page = params?.page || 1;
  const limit = params?.limit || 50;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // Filter by admin ID
  if (params?.admin_id) {
    query = query.eq('admin_id', params.admin_id);
  }

  // Filter by date range
  if (params?.startDate) {
    query = query.gte('created_at', params.startDate);
  }
  if (params?.endDate) {
    query = query.lte('created_at', params.endDate);
  }

  // Filter by action type
  if (params?.action) {
    query = query.ilike('action', `%${params.action}%`);
  }

  // Filter by entity/resource type
  if (params?.entityType) {
    query = query.eq('resource_type', params.entityType);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  // Transform to match frontend ActivityLog type
  const logs = (data ?? []).map((log: any) => {
    // Parse details if it's a string (Supabase sometimes returns JSONB as string)
    let parsedDetails;
    try {
      if (typeof log.details === 'string') {
        parsedDetails = JSON.parse(log.details);
      } else if (typeof log.details === 'object') {
        parsedDetails = log.details;
      } else {
        parsedDetails = {};
      }
    } catch {
      parsedDetails = {};
    }

    // Extract admin name from parsed details (handles both admin_name and adminName)
    const adminName = parsedDetails?.adminName || parsedDetails?.admin_name || 'System';

    // Format details for display - show all relevant information
    let formattedDetails = '';
    if (parsedDetails && Object.keys(parsedDetails).length > 0) {
      const detailParts = [];
      
      // Show affected user info (who was deleted/suspended)
      if (parsedDetails.userName) {
        detailParts.push(`User: ${parsedDetails.userName}`);
      }
      if (parsedDetails.userEmail) {
        detailParts.push(`Email: ${parsedDetails.userEmail}`);
      }
      
      // Add action if present (e.g., "suspended", "unsuspended", "deleted")
      if (parsedDetails.action) {
        detailParts.push(`Action: ${parsedDetails.action}`);
      }
      
      // Add message if present
      if (parsedDetails.message) {
        detailParts.push(`Message: ${parsedDetails.message}`);
      }
      
      // Add any other email if present (for login events)
      if (parsedDetails.email && !parsedDetails.userEmail) {
        detailParts.push(`Email: ${parsedDetails.email}`);
      }
      
      // If we have formatted parts, use them; otherwise show relevant fields
      if (detailParts.length > 0) {
        formattedDetails = detailParts.join(' | ');
      } else {
        // Show all other fields except internal IDs
        formattedDetails = Object.entries(parsedDetails)
          .filter(([key]) => !['adminName', 'admin_name', 'deletedBy', 'updatedBy'].includes(key))  
          .map(([key, value]) => `${key}: ${value}`)
          .join(' | ');
      }
    }

    return {
      id: log.id,
      admin_name: adminName,
      action: log.action?.split('.')[1] || log.action,
      entity: log.resource_type,
      entity_id: log.resource_id,
      details: formattedDetails || '',
      ip_address: log.ip_address,
      created_at: log.created_at
    };
  });

  return {
    data: logs,
    meta: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit)
    }
  };
};

export const createActivityLog = async (log: {
  admin_id?: string;
  admin_name: string;
  action: string;
  entity: string;
  entity_id?: string;
  details?: string;
  ip_address?: string;
}) => {
  const { data, error } = await supabase
    .from('audit_logs')
    .insert([
      {
        admin_id: log.admin_id,
        action: `${log.entity}.${log.action}`,
        resource_type: log.entity,
        resource_id: log.entity_id,
        details: { admin_name: log.admin_name, message: log.details },
        ip_address: log.ip_address
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

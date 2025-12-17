-- Campaign filtering and sorting
CREATE INDEX IF NOT EXISTS idx_campaigns_active_dates 
ON campaigns(is_active, end_date DESC, start_date DESC) 
WHERE is_active = true;

-- Campaign analytics
CREATE INDEX IF NOT EXISTS idx_campaign_views_campaign_user 
ON campaign_views(campaign_id, user_id);

CREATE INDEX IF NOT EXISTS idx_campaign_views_viewed_at 
ON campaign_views(viewed_at DESC);

-- Machine filtering for active machines
CREATE INDEX IF NOT EXISTS idx_machines_active 
ON machines(machine_operation_state, last_machine_status) 
WHERE machine_operation_state = 'active';

-- Machine geospatial queries using standard lat/lon indexes
CREATE INDEX IF NOT EXISTS idx_machines_lat_lon 
ON machines(location_latitude, location_longitude) 
WHERE location_latitude IS NOT NULL AND location_longitude IS NOT NULL;

-- Comments
COMMENT ON INDEX idx_campaigns_active_dates IS 'Optimize campaign list queries filtered by active status';
COMMENT ON INDEX idx_campaign_views_campaign_user IS 'Fast lookups for campaign view analytics';
COMMENT ON INDEX idx_machines_active IS 'Filter active machines efficiently';

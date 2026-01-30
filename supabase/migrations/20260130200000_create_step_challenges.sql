-- Step Challenge Module
-- Gamification feature for walking challenges at machine locations

-- 1. Step Challenges - Challenge definitions
CREATE TABLE step_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  machine_id UUID REFERENCES machines(id) ON DELETE SET NULL,
  location_name VARCHAR(200),  -- Denormalized for display
  location_latitude DECIMAL(10,8),
  location_longitude DECIMAL(11,8),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  -- Badge thresholds: [{steps: 1000, badge_name: "Walker", badge_icon: "🚶"}, ...]
  badge_thresholds JSONB DEFAULT '[]'::jsonb,
  created_by_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_challenge_dates CHECK (start_date < end_date)
);

-- Indexes for step_challenges
CREATE INDEX idx_step_challenges_active ON step_challenges(is_active);
CREATE INDEX idx_step_challenges_dates ON step_challenges(start_date, end_date);
CREATE INDEX idx_step_challenges_machine ON step_challenges(machine_id);
CREATE INDEX idx_step_challenges_location ON step_challenges(location_latitude, location_longitude);

-- 2. Step Challenge Participants - User registrations
CREATE TABLE step_challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES step_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_steps INT DEFAULT 0 CHECK (total_steps >= 0),
  last_step_update TIMESTAMPTZ,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  -- Unique constraint: one registration per user per challenge
  CONSTRAINT unique_challenge_participant UNIQUE(challenge_id, user_id)
);

-- Indexes for participants
CREATE INDEX idx_step_participants_challenge ON step_challenge_participants(challenge_id);
CREATE INDEX idx_step_participants_user ON step_challenge_participants(user_id);
CREATE INDEX idx_step_participants_steps ON step_challenge_participants(total_steps DESC);

-- 3. Step Submissions - Individual step count submissions from health apps
CREATE TABLE step_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES step_challenge_participants(id) ON DELETE CASCADE,
  steps INT NOT NULL CHECK (steps > 0),
  source VARCHAR(50),  -- 'apple_health', 'health_connect'
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  device_info JSONB  -- Optional metadata from health app
);

-- Indexes for submissions
CREATE INDEX idx_step_submissions_participant ON step_submissions(participant_id);
CREATE INDEX idx_step_submissions_date ON step_submissions(submitted_at);

-- 4. User Badges - Earned badges (cosmetic achievements)
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES step_challenges(id) ON DELETE SET NULL,
  badge_name VARCHAR(50) NOT NULL,
  badge_type VARCHAR(20) NOT NULL,  -- 'steps', 'ranking', 'completion'
  badge_icon VARCHAR(50),
  steps_achieved INT,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for badges
CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_challenge ON user_badges(challenge_id);
CREATE INDEX idx_user_badges_type ON user_badges(badge_type);

-- Function to check if user is already in an active challenge
CREATE OR REPLACE FUNCTION check_single_active_challenge()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user is already participating in another active challenge
  IF EXISTS (
    SELECT 1 FROM step_challenge_participants p
    JOIN step_challenges c ON c.id = p.challenge_id
    WHERE p.user_id = NEW.user_id
      AND c.is_active = true
      AND c.end_date > NOW()
      AND c.id != NEW.challenge_id
  ) THEN
    RAISE EXCEPTION 'User is already participating in an active challenge';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single active challenge per user
CREATE TRIGGER enforce_single_active_challenge
  BEFORE INSERT ON step_challenge_participants
  FOR EACH ROW
  EXECUTE FUNCTION check_single_active_challenge();

-- Function to get challenge leaderboard with rankings
CREATE OR REPLACE FUNCTION get_challenge_leaderboard(
  p_challenge_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  rank BIGINT,
  user_id UUID,
  user_name TEXT,
  total_steps INT,
  last_update TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    RANK() OVER (ORDER BY p.total_steps DESC) as rank,
    p.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as user_name,
    p.total_steps,
    p.last_step_update as last_update
  FROM step_challenge_participants p
  JOIN users u ON u.id = p.user_id
  WHERE p.challenge_id = p_challenge_id
  ORDER BY p.total_steps DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE step_challenges IS 'Walking challenges at machine locations';
COMMENT ON TABLE step_challenge_participants IS 'Users registered for step challenges';
COMMENT ON TABLE step_submissions IS 'Step count submissions from health apps';
COMMENT ON TABLE user_badges IS 'Cosmetic badges earned by users';
COMMENT ON FUNCTION check_single_active_challenge() IS 'Ensures user can only join one active challenge at a time';
COMMENT ON FUNCTION get_challenge_leaderboard(UUID, INT) IS 'Returns ranked leaderboard for a challenge';

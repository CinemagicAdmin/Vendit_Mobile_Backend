-- Migration: Atomic step submission with row locking
-- Date: 2026-02-03

CREATE OR REPLACE FUNCTION submit_steps_atomic(
  p_participant_id UUID,
  p_steps INT,
  p_is_absolute BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(new_total INT, steps_added INT, previous_total INT) AS $$
DECLARE
  v_previous_total INT;
  v_new_total INT;
  v_steps_added INT;
BEGIN
  SELECT total_steps INTO v_previous_total
  FROM step_challenge_participants
  WHERE id = p_participant_id
  FOR UPDATE;
  
  v_previous_total := COALESCE(v_previous_total, 0);
  
  IF p_is_absolute THEN
    IF p_steps > v_previous_total THEN
      v_new_total := p_steps;
      v_steps_added := p_steps - v_previous_total;
    ELSE
      v_new_total := v_previous_total;
      v_steps_added := 0;
    END IF;
  ELSE
    v_new_total := v_previous_total + p_steps;
    v_steps_added := p_steps;
  END IF;
  
  IF v_steps_added > 0 THEN
    UPDATE step_challenge_participants
    SET total_steps = v_new_total,
        last_step_update = NOW()
    WHERE id = p_participant_id;
  END IF;
  
  RETURN QUERY SELECT v_new_total, v_steps_added, v_previous_total;
END;
$$ LANGUAGE plpgsql;

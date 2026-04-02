-- Atomic scan XP + domain cooldown (single transaction per call; Neon HTTP–safe).
-- Level formula must match shared/gamification.ts calculateLevel: floor(sqrt(totalXp / 100)) + 1

CREATE OR REPLACE FUNCTION award_scan_xp_with_cooldown(
  p_user_id varchar,
  p_domain text,
  p_xp_delta integer,
  p_cooldown_hours integer DEFAULT 24
)
RETURNS TABLE (
  xp_gained integer,
  total_xp integer,
  new_level integer,
  old_level integer,
  level_up boolean,
  cooldown_active boolean,
  user_found boolean
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_xp integer;
  v_old_level integer;
  v_new_xp integer;
  v_new_level integer;
  v_last_scan timestamp;
  v_on_cooldown boolean := false;
BEGIN
  IF p_xp_delta < 0 THEN
    RAISE EXCEPTION 'xp_delta must be non-negative';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text), hashtext(p_domain::text));

  SELECT u.xp, u.level INTO v_old_xp, v_old_level
  FROM users u
  WHERE u.id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, 0, 0, false, false, false;
    RETURN;
  END IF;

  SELECT c.last_scan_at INTO v_last_scan
  FROM user_domain_cooldowns c
  WHERE c.user_id = p_user_id AND c.domain = p_domain;

  IF v_last_scan IS NOT NULL THEN
    IF (now() - v_last_scan) < (p_cooldown_hours * interval '1 hour') THEN
      v_on_cooldown := true;
    END IF;
  END IF;

  IF v_on_cooldown THEN
    RETURN QUERY SELECT 0, v_old_xp, v_old_level, v_old_level, false, true, true;
    RETURN;
  END IF;

  UPDATE users
  SET
    xp = xp + p_xp_delta,
    level = (floor(sqrt(((xp + p_xp_delta)::numeric / 100))) + 1)::int,
    updated_at = now()
  WHERE id = p_user_id
  RETURNING xp, level INTO v_new_xp, v_new_level;

  INSERT INTO user_domain_cooldowns (user_id, domain, last_scan_at)
  VALUES (p_user_id, p_domain, now())
  ON CONFLICT (user_id, domain)
  DO UPDATE SET last_scan_at = excluded.last_scan_at;

  RETURN QUERY SELECT
    p_xp_delta,
    v_new_xp,
    v_new_level,
    v_old_level,
    (v_new_level > v_old_level),
    false,
    true;
END;
$$;

-- Align stored copy with shared/gamification ACHIEVEMENTS.GUARDIAN (optional for existing DBs)
UPDATE achievements
SET description = 'Completed 10 scans where security.txt was found'
WHERE "key" = 'GUARDIAN';

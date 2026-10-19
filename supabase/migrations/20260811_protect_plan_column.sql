-- Migration: Protect users.plan and users.plan_expires_at from unauthorized client-side updates
-- Prevents authenticated standard users from escalating privileges by updating their plan column directly.

CREATE OR REPLACE FUNCTION prevent_client_plan_update()
RETURNS TRIGGER AS $$
BEGIN
    -- If trigger is invoked by service_role (admin client/webhooks), allow update
    IF current_setting('role', true) = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Otherwise, prevent non-admin clients from changing plan or plan_expires_at
    IF NEW.plan IS DISTINCT FROM OLD.plan OR NEW.plan_expires_at IS DISTINCT FROM OLD.plan_expires_at THEN
        NEW.plan := OLD.plan;
        NEW.plan_expires_at := OLD.plan_expires_at;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_client_plan_update ON public.users;

CREATE TRIGGER trg_prevent_client_plan_update
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION prevent_client_plan_update();

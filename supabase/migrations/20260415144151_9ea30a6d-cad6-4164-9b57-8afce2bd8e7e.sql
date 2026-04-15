
-- Activity log table
CREATE TABLE public.lead_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  action text NOT NULL,
  description text,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_activity_log_lead_id ON public.lead_activity_log(lead_id);
CREATE INDEX idx_lead_activity_log_created_at ON public.lead_activity_log(created_at);

ALTER TABLE public.lead_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity logs"
ON public.lead_activity_log FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert activity logs"
ON public.lead_activity_log FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Allow service role / triggers to insert (security definer functions handle this)

-- 1. Trigger: Lead created
CREATE OR REPLACE FUNCTION public.log_lead_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.lead_activity_log (lead_id, action, description, performed_by)
  VALUES (NEW.id, 'created', 'Lead "' || NEW.client_name || '" was created', NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lead_created
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.log_lead_created();

-- 2. Trigger: Lead updated (stage, assignment, details)
CREATE OR REPLACE FUNCTION public.log_lead_updated()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  old_stage_name text;
  new_stage_name text;
BEGIN
  -- Stage change
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    SELECT name INTO old_stage_name FROM public.pipeline_stages WHERE id = OLD.stage_id;
    SELECT name INTO new_stage_name FROM public.pipeline_stages WHERE id = NEW.stage_id;
    INSERT INTO public.lead_activity_log (lead_id, action, description)
    VALUES (NEW.id, 'stage_changed', 'Moved from "' || COALESCE(old_stage_name, 'Unknown') || '" to "' || COALESCE(new_stage_name, 'Unknown') || '"');
  END IF;

  -- Assignment change
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    IF NEW.assigned_to IS NULL THEN
      INSERT INTO public.lead_activity_log (lead_id, action, description)
      VALUES (NEW.id, 'unassigned', 'Lead was unassigned');
    ELSE
      INSERT INTO public.lead_activity_log (lead_id, action, description, performed_by)
      VALUES (NEW.id, 'assigned', 'Lead was assigned', NEW.assigned_to);
    END IF;
  END IF;

  -- Details change (name, email, phone, package, notes, source)
  IF OLD.client_name IS DISTINCT FROM NEW.client_name
     OR OLD.email IS DISTINCT FROM NEW.email
     OR OLD.phone IS DISTINCT FROM NEW.phone
     OR OLD.package IS DISTINCT FROM NEW.package
     OR OLD.notes IS DISTINCT FROM NEW.notes
     OR OLD.source IS DISTINCT FROM NEW.source THEN
    INSERT INTO public.lead_activity_log (lead_id, action, description)
    VALUES (NEW.id, 'details_updated', 'Lead details were updated');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lead_updated
AFTER UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.log_lead_updated();

-- 3. Trigger: Comment added
CREATE OR REPLACE FUNCTION public.log_comment_added()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.lead_activity_log (lead_id, action, description, performed_by)
  VALUES (NEW.lead_id, 'comment_added', 'A comment was added', NEW.author_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lead_comment_added
AFTER INSERT ON public.lead_comments
FOR EACH ROW EXECUTE FUNCTION public.log_comment_added();

-- 4. Trigger: Checklist item toggled
CREATE OR REPLACE FUNCTION public.log_checklist_toggled()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  criteria_label text;
BEGIN
  SELECT label INTO criteria_label FROM public.stage_criteria WHERE id = NEW.criteria_id;
  IF NEW.checked AND NOT OLD.checked THEN
    INSERT INTO public.lead_activity_log (lead_id, action, description, performed_by)
    VALUES (NEW.lead_id, 'checklist_checked', 'Checked: "' || COALESCE(criteria_label, 'Unknown') || '"', NEW.checked_by);
  ELSIF NOT NEW.checked AND OLD.checked THEN
    INSERT INTO public.lead_activity_log (lead_id, action, description, performed_by)
    VALUES (NEW.lead_id, 'checklist_unchecked', 'Unchecked: "' || COALESCE(criteria_label, 'Unknown') || '"', NEW.checked_by);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_checklist_toggled
AFTER UPDATE ON public.lead_criteria_checks
FOR EACH ROW EXECUTE FUNCTION public.log_checklist_toggled();

-- 5. Trigger: Lead assignment table changes (multi-assign)
CREATE OR REPLACE FUNCTION public.log_lead_assignment_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  assignee_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(full_name, email) INTO assignee_name FROM public.profiles WHERE user_id = NEW.user_id;
    INSERT INTO public.lead_activity_log (lead_id, action, description, performed_by)
    VALUES (NEW.lead_id, 'assigned', COALESCE(assignee_name, 'Someone') || ' was assigned', NEW.user_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT COALESCE(full_name, email) INTO assignee_name FROM public.profiles WHERE user_id = OLD.user_id;
    INSERT INTO public.lead_activity_log (lead_id, action, description)
    VALUES (OLD.lead_id, 'unassigned', COALESCE(assignee_name, 'Someone') || ' was unassigned');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_lead_assignment_change
AFTER INSERT OR DELETE ON public.lead_assignments
FOR EACH ROW EXECUTE FUNCTION public.log_lead_assignment_change();

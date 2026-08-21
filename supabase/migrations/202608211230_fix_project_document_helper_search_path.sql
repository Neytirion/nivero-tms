-- Restore explicit search_path for project_id_from_document_object_name.
-- A later migration recreated this function without SET search_path,
-- which triggers a security linter warning and weakens hardening.

BEGIN;

CREATE OR REPLACE FUNCTION public.project_id_from_document_object_name(
  p_object_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, storage
AS $$
DECLARE
  v_prefix TEXT;
BEGIN
  v_prefix := (storage.foldername(p_object_name))[1];

  IF v_prefix IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_prefix ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RETURN v_prefix::UUID;
  END IF;

  RETURN NULL;
END;
$$;

COMMIT;

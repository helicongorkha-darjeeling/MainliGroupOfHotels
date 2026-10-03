-- Owner-approved on 2026-10-03: a Double Room has one starting price.
-- Preserve validation, rate limiting, session ownership, expiry and grants.
do $migration$
declare
  original_definition text;
  old_expression constant text := '((party_guests / 2) * 250000::bigint + (party_guests % 2) * 150000::bigint)';
  new_expression constant text := 'room_count * 250000::bigint';
begin
  original_definition := pg_get_functiondef('public.save_checkout_draft(uuid,text,text,text,text,text,text,date,date,integer)'::regprocedure);
  if strpos(original_definition, old_expression) = 0 then
    raise exception 'Unexpected checkout pricing definition; refusing to change it';
  end if;
  execute replace(original_definition, old_expression, new_expression);
end;
$migration$;
notify pgrst, 'reload schema';

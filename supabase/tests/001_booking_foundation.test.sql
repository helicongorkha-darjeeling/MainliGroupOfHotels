begin;

select plan(12);

select has_table('public', 'properties', 'properties table exists');
select has_table('public', 'bookings', 'bookings table exists');
select has_table('public', 'inventory_allocations', 'shared inventory allocation table exists');
select has_table('public', 'room_housekeeping', 'room housekeeping table exists');
select has_table('public', 'payments', 'payments table exists');
select has_table('public', 'refunds', 'refunds are distinct records');
select has_function('public', 'search_public_availability', array['text', 'date', 'date', 'integer'], 'availability is server-calculated');
select has_function('public', 'create_online_inventory_hold', array['text', 'uuid', 'date', 'date', 'integer', 'integer'], 'transactional hold function exists');
select results_eq('select count(*)::bigint from public.rooms', array[25::bigint], 'all 25 provisional room records are seeded');
select results_eq('select count(*)::bigint from public.rooms where status = ''draft''', array[25::bigint], 'every seeded room is draft');
select results_eq('select count(*)::bigint from public.room_housekeeping', array[25::bigint], 'every room has an operational housekeeping row');
select results_eq('select live_bookings_enabled from public.booking_settings where property_id = ''11111111-1111-4111-8111-111111111111''', array[false], 'live bookings fail closed');

select * from finish();
rollback;

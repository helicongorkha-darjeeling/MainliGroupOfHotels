create index if not exists hotel_booking_audit_actor_idx on public.hotel_booking_audit(actor_id);
create index if not exists hotel_booking_audit_reservation_idx on public.hotel_booking_audit(reservation_id);
create index if not exists hotel_inventory_rooms_category_idx on public.hotel_inventory_rooms(category);
create index if not exists hotel_room_assignments_room_idx on public.hotel_room_assignments(room_number);
create index if not exists hotel_seasonal_rates_creator_idx on public.hotel_seasonal_rates(created_by);

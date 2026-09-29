# Operations and recovery

## Routine checks

- Monitor `/api/health` for process availability and `/api/readiness` for configuration/database readiness.
- Schedule `POST /api/cron/expire-holds` with `Authorization: Bearer <CRON_SECRET>` once live holds exist.
- Alert on repeated readiness failures, allocation conflicts, failed webhooks, payment-review bookings and hold-expiry job failures.
- Keep guest PII out of analytics, alert messages and routine application logs.

## Backups

Before live launch, enable a Supabase plan with the recovery window the owner accepts. Record the project, retention period, restore owner and quarterly drill date outside the application repository.

Before every schema release:

1. Confirm the latest managed backup completed.
2. Export schema and data through an authorised administrator workflow to encrypted storage.
3. Record the release commit and migration version.
4. Apply first to preview and verify booking, payment and access-control tests.

Never store production guest exports in Git or an unencrypted shared folder.

## Recovery drill

1. Restore the latest backup into a new isolated Supabase project.
2. Point a Vercel preview deployment at the restored project using preview secrets.
3. Keep `BOOKING_MODE=preview`.
4. Re-run database tests and verify booking totals, allocations, payments, staff scopes and audit records.
5. Record recovery-point loss, recovery time and discrepancies.
6. Delete the temporary restored project only after the result is signed off and any required evidence is retained.

## Payment or inventory incident

- Switch `BOOKING_MODE` back to `preview`; do not delete bookings or payment events.
- Place ambiguous payments into review and reconcile against the provider dashboard.
- Keep cancellation and refund decisions as separate recorded actions.
- Restore service only after inventory integrity and webhook idempotency are verified.

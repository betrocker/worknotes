-- Demo reset seed.
-- WARNING: This hard-deletes existing app data for the selected user and
-- inserts English demo clients/jobs for screenshots.
--
-- If you run this from the app/session context, auth.uid() should be set.
-- If you run it from Supabase SQL Editor and auth.uid() is null, replace the
-- v_user_id assignment below with your demo auth.users.id, for example:
-- v_user_id uuid := '00000000-0000-0000-0000-000000000000'::uuid;

begin;

do $$
declare
  v_user_id uuid := auth.uid();

  c_olivia uuid := '10000000-0000-4000-8000-000000000001';
  c_noah uuid := '10000000-0000-4000-8000-000000000002';
  c_emma uuid := '10000000-0000-4000-8000-000000000003';
  c_liam uuid := '10000000-0000-4000-8000-000000000004';
  c_sophia uuid := '10000000-0000-4000-8000-000000000005';

  j_active uuid := '20000000-0000-4000-8000-000000000001';
  j_pending uuid := '20000000-0000-4000-8000-000000000002';
  j_scheduled uuid := '20000000-0000-4000-8000-000000000003';
  j_done uuid := '20000000-0000-4000-8000-000000000004';
  j_archived uuid := '20000000-0000-4000-8000-000000000005';
begin
  if v_user_id is null then
    raise exception 'No authenticated user id. Replace v_user_id with your demo auth.users.id before running this seed.';
  end if;

  delete from public.job_images
  where user_id = v_user_id;

  delete from public.job_invoice_items
  where user_id = v_user_id;

  delete from public.invoices
  where user_id = v_user_id;

  delete from public.expenses
  where user_id = v_user_id;

  delete from public.payments
  where user_id = v_user_id;

  delete from public.jobs
  where user_id = v_user_id;

  delete from public.clients
  where user_id = v_user_id;

  insert into public.clients (
    id, user_id, name, phone, address, note, created_at, updated_at, deleted_at
  )
  values
    (
      c_olivia,
      v_user_id,
      'Olivia Bennett',
      '+1 555 0101',
      '18 Maple Street, Brooklyn, NY',
      'Prefers morning appointments. Apartment 4B.',
      now() - interval '14 days',
      now() - interval '2 days',
      null
    ),
    (
      c_noah,
      v_user_id,
      'Noah Carter',
      '+1 555 0102',
      '72 Oak Avenue, Queens, NY',
      'Gate code 1842. Send invoice by email.',
      now() - interval '12 days',
      now() - interval '3 days',
      null
    ),
    (
      c_emma,
      v_user_id,
      'Emma Wilson',
      '+1 555 0103',
      '9 River Road, Hoboken, NJ',
      'Works from home after 3 PM.',
      now() - interval '10 days',
      now() - interval '1 day',
      null
    ),
    (
      c_liam,
      v_user_id,
      'Liam Harris',
      '+1 555 0104',
      '45 Pine Lane, Jersey City, NJ',
      'Ask building concierge for access.',
      now() - interval '8 days',
      now() - interval '5 days',
      null
    ),
    (
      c_sophia,
      v_user_id,
      'Sophia Miller',
      '+1 555 0105',
      '210 Cedar Court, Newark, NJ',
      'Demo archived customer.',
      now() - interval '30 days',
      now() - interval '12 days',
      null
    );

  insert into public.jobs (
    id,
    user_id,
    client_id,
    title,
    description,
    pending_reason,
    price,
    status,
    scheduled_date,
    completed_at,
    archived_at,
    created_at,
    updated_at,
    deleted_at
  )
  values
    (
      j_active,
      v_user_id,
      c_olivia,
      'Kitchen sink leak repair',
      'Inspect the leak, replace the trap and worn seals, then test drainage under load.',
      null,
      320,
      'in_progress',
      current_date,
      null,
      null,
      now() - interval '4 days',
      now() - interval '1 hour',
      null
    ),
    (
      j_pending,
      v_user_id,
      c_noah,
      'Bathroom tile repair',
      'Remove damaged tiles, prepare the surface, install matching tiles, and finish the grout.',
      'Waiting for tile color confirmation from the client.',
      480,
      'pending',
      null,
      null,
      null,
      now() - interval '3 days',
      now() - interval '2 hours',
      null
    ),
    (
      j_scheduled,
      v_user_id,
      c_emma,
      'Annual HVAC service',
      'Complete annual inspection, clean the unit, replace filters, and verify thermostat behavior.',
      null,
      260,
      'scheduled',
      current_date + 3,
      null,
      null,
      now() - interval '2 days',
      now() - interval '1 day',
      null
    ),
    (
      j_done,
      v_user_id,
      c_liam,
      'Office light fixture install',
      'Install three LED fixtures, adjust wiring, and test switches in the front office.',
      null,
      540,
      'done',
      current_date - 6,
      current_date - 5,
      null,
      now() - interval '10 days',
      now() - interval '5 days',
      null
    ),
    (
      j_archived,
      v_user_id,
      c_sophia,
      'Garage door sensor replacement',
      'Replace faulty safety sensors, align the beam, and test the garage door cycle.',
      null,
      190,
      'done',
      current_date - 20,
      current_date - 19,
      now() - interval '12 days',
      now() - interval '25 days',
      now() - interval '12 days',
      null
    );

  insert into public.payments (
    id, user_id, job_id, amount, payment_date, note, updated_at, deleted_at
  )
  values
    (
      '30000000-0000-4000-8000-000000000001',
      v_user_id,
      j_active,
      100,
      current_date,
      'Deposit paid after inspection.',
      now() - interval '2 hours',
      null
    ),
    (
      '30000000-0000-4000-8000-000000000002',
      v_user_id,
      j_done,
      540,
      current_date - 5,
      'Paid in full.',
      now() - interval '5 days',
      null
    ),
    (
      '30000000-0000-4000-8000-000000000003',
      v_user_id,
      j_archived,
      190,
      current_date - 19,
      'Paid in full.',
      now() - interval '19 days',
      null
    );

  insert into public.expenses (
    id, user_id, job_id, title, amount, created_at, updated_at, deleted_at
  )
  values
    (
      '40000000-0000-4000-8000-000000000001',
      v_user_id,
      j_active,
      'Plumbing fittings',
      38,
      now() - interval '3 hours',
      now() - interval '3 hours',
      null
    ),
    (
      '40000000-0000-4000-8000-000000000002',
      v_user_id,
      j_pending,
      'Sample tiles',
      24,
      now() - interval '2 days',
      now() - interval '2 days',
      null
    ),
    (
      '40000000-0000-4000-8000-000000000003',
      v_user_id,
      j_done,
      'Mounting hardware',
      42,
      now() - interval '6 days',
      now() - interval '6 days',
      null
    );

  insert into public.job_invoice_items (
    id, user_id, job_id, title, unit, quantity, unit_price, total, position, created_at, updated_at, deleted_at
  )
  values
    (
      '50000000-0000-4000-8000-000000000001',
      v_user_id,
      j_active,
      'Diagnostic visit',
      'service',
      1,
      60,
      60,
      1,
      now() - interval '4 days',
      now() - interval '4 days',
      null
    ),
    (
      '50000000-0000-4000-8000-000000000002',
      v_user_id,
      j_active,
      'Trap replacement',
      'piece',
      1,
      140,
      140,
      2,
      now() - interval '4 days',
      now() - interval '4 days',
      null
    ),
    (
      '50000000-0000-4000-8000-000000000003',
      v_user_id,
      j_active,
      'Sealant and fittings',
      'set',
      1,
      120,
      120,
      3,
      now() - interval '4 days',
      now() - interval '4 days',
      null
    ),
    (
      '50000000-0000-4000-8000-000000000004',
      v_user_id,
      j_pending,
      'Site protection',
      'service',
      1,
      80,
      80,
      1,
      now() - interval '3 days',
      now() - interval '3 days',
      null
    ),
    (
      '50000000-0000-4000-8000-000000000005',
      v_user_id,
      j_pending,
      'Tile replacement labor',
      'hour',
      4,
      100,
      400,
      2,
      now() - interval '3 days',
      now() - interval '3 days',
      null
    ),
    (
      '50000000-0000-4000-8000-000000000006',
      v_user_id,
      j_scheduled,
      'HVAC inspection',
      'service',
      1,
      120,
      120,
      1,
      now() - interval '2 days',
      now() - interval '2 days',
      null
    ),
    (
      '50000000-0000-4000-8000-000000000007',
      v_user_id,
      j_scheduled,
      'Filter replacement',
      'piece',
      2,
      45,
      90,
      2,
      now() - interval '2 days',
      now() - interval '2 days',
      null
    ),
    (
      '50000000-0000-4000-8000-000000000008',
      v_user_id,
      j_scheduled,
      'System cleaning',
      'service',
      1,
      50,
      50,
      3,
      now() - interval '2 days',
      now() - interval '2 days',
      null
    ),
    (
      '50000000-0000-4000-8000-000000000009',
      v_user_id,
      j_done,
      'LED fixture installation',
      'piece',
      3,
      120,
      360,
      1,
      now() - interval '10 days',
      now() - interval '10 days',
      null
    ),
    (
      '50000000-0000-4000-8000-000000000010',
      v_user_id,
      j_done,
      'Wiring adjustment',
      'service',
      1,
      180,
      180,
      2,
      now() - interval '10 days',
      now() - interval '10 days',
      null
    ),
    (
      '50000000-0000-4000-8000-000000000011',
      v_user_id,
      j_archived,
      'Sensor replacement',
      'service',
      1,
      150,
      150,
      1,
      now() - interval '25 days',
      now() - interval '25 days',
      null
    ),
    (
      '50000000-0000-4000-8000-000000000012',
      v_user_id,
      j_archived,
      'Travel and testing',
      'service',
      1,
      40,
      40,
      2,
      now() - interval '25 days',
      now() - interval '25 days',
      null
    );

  insert into public.invoices (
    id,
    user_id,
    job_id,
    invoice_number,
    sequence_number,
    year,
    issued_at,
    created_at,
    updated_at,
    deleted_at
  )
  values
    (
      '60000000-0000-4000-8000-000000000001',
      v_user_id,
      j_active,
      '001/26',
      1,
      2026,
      current_date,
      now() - interval '4 days',
      now() - interval '4 days',
      null
    ),
    (
      '60000000-0000-4000-8000-000000000002',
      v_user_id,
      j_pending,
      '002/26',
      2,
      2026,
      current_date,
      now() - interval '3 days',
      now() - interval '3 days',
      null
    ),
    (
      '60000000-0000-4000-8000-000000000003',
      v_user_id,
      j_scheduled,
      '003/26',
      3,
      2026,
      current_date,
      now() - interval '2 days',
      now() - interval '2 days',
      null
    ),
    (
      '60000000-0000-4000-8000-000000000004',
      v_user_id,
      j_done,
      '004/26',
      4,
      2026,
      current_date - 5,
      now() - interval '10 days',
      now() - interval '5 days',
      null
    ),
    (
      '60000000-0000-4000-8000-000000000005',
      v_user_id,
      j_archived,
      '005/26',
      5,
      2026,
      current_date - 19,
      now() - interval '25 days',
      now() - interval '19 days',
      null
    );

  raise notice 'Demo data inserted for user %: 5 clients, 5 jobs.', v_user_id;
end $$;

commit;

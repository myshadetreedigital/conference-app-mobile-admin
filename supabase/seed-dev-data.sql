-- Dev/testing seed data. Safe to re-run — everything is scoped to
-- your existing organization and its most recently created event
-- (picked via subquery, so no UUIDs need to be typed by hand). Not a
-- migration: this is NOT numbered into supabase/migrations/ and
-- should never be run against a real customer database.

-- Speakers
insert into public.speakers (event_id, name, title, bio)
select e.id, s.name, s.title, s.bio
from public.events e
cross join (values
  ('Jordan Lee', 'VP of Engineering, Acme Corp', 'Jordan has spent 12 years building developer tools and leads a team of 40 engineers.'),
  ('Priya Nair', 'Founder, Nairobi Labs', 'Priya builds infrastructure for climate-tech startups across East Africa.'),
  ('Sam Ortiz', 'Staff Designer, Prism', 'Sam focuses on accessible design systems for enterprise software.')
) as s(name, title, bio)
where e.id = (select id from public.events order by created_at desc limit 1);

-- Sponsors (several per tier, so you can see the tier grouping and
-- the sponsorship-level filter with more than one result per level)
insert into public.sponsors (event_id, name, tier, website_url)
select e.id, s.name, s.tier, s.website_url
from public.events e
cross join (values
  ('Globex', 'diamond', 'https://example.com/globex'),
  ('Wonka Industries', 'diamond', 'https://example.com/wonka'),
  ('Stark Industries', 'platinum', 'https://example.com/stark'),
  ('Wayne Enterprises', 'platinum', 'https://example.com/wayne'),
  ('Hooli', 'platinum', 'https://example.com/hooli'),
  ('Initech', 'gold', 'https://example.com/initech'),
  ('Pied Piper', 'gold', 'https://example.com/piedpiper'),
  ('Massive Dynamic', 'silver', 'https://example.com/massivedynamic'),
  ('Gringotts', 'silver', 'https://example.com/gringotts'),
  ('Aperture Science', 'bronze', 'https://example.com/aperture'),
  ('Umbrella Supplies', 'a_la_carte', 'https://example.com/umbrella')
) as s(name, tier, website_url)
where e.id = (select id from public.events order by created_at desc limit 1);

-- Sessions. Opening Keynote and Scaling deliberately overlap
-- (9:00-10:00 vs 9:30-10:30) so the mobile app's double-booking
-- conflict check has something real to trigger on.
insert into public.sessions (event_id, title, description, location, starts_at, ends_at)
select e.id, s.title, s.description, s.location, s.starts_at::timestamptz, s.ends_at::timestamptz
from public.events e
cross join (values
  ('Opening Keynote', 'Welcome and state of the industry.', 'Main Hall', '2026-10-15 09:00:00-04', '2026-10-15 10:00:00-04'),
  ('Scaling Without Losing Your Mind', 'Lessons from three failed rewrites.', 'Room B', '2026-10-15 09:30:00-04', '2026-10-15 10:30:00-04'),
  ('Panel: The Future of DevTools', 'Three speakers debate what''s next.', 'Main Hall', '2026-10-15 10:45:00-04', '2026-10-15 11:30:00-04')
) as s(title, description, location, starts_at, ends_at)
where e.id = (select id from public.events order by created_at desc limit 1);

-- Link speakers to sessions (many-to-many via session_speakers).
insert into public.session_speakers (session_id, speaker_id)
select s.id, sp.id
from public.sessions s
join public.speakers sp on sp.event_id = s.event_id
where s.event_id = (select id from public.events order by created_at desc limit 1)
and (
  (s.title = 'Opening Keynote' and sp.name = 'Jordan Lee')
  or (s.title = 'Scaling Without Losing Your Mind' and sp.name in ('Priya Nair', 'Sam Ortiz'))
  or (s.title = 'Panel: The Future of DevTools' and sp.name in ('Jordan Lee', 'Priya Nair', 'Sam Ortiz'))
);

-- Personal contacts — owned by a specific user, looked up by email
-- (auth.uid() returns null in the SQL editor's own connection, since
-- it isn't a real authenticated app session). Replace the email
-- below with the account you want these contacts attached to.
insert into public.personal_contacts (owner_id, event_id, name, email, phone, notes)
select u.id, e.id, c.name, c.email, c.phone, c.notes
from public.events e
cross join (select id from auth.users where email = 'rabbconsultingllc@gmail.com') as u
cross join (values
  ('Taylor Brooks', 'taylor@example.com', '555-0142', 'Met at the sponsor booth, follow up about the API.'),
  ('Morgan Diaz', '', '555-0199', 'Speaker for the afternoon track.')
) as c(name, email, phone, notes)
where e.id = (select id from public.events order by created_at desc limit 1);

-- Same, for the mobile app's test login (tr2962@gmail.com).
insert into public.personal_contacts (owner_id, event_id, name, email, phone, notes)
select u.id, e.id, c.name, c.email, c.phone, c.notes
from public.events e
cross join (select id from auth.users where email = 'tr2962@gmail.com') as u
cross join (values
  ('Casey Rivera', 'casey@example.com', '555-0177', 'Sat next to me during the opening keynote.'),
  ('Jamie Chen', '', '555-0188', 'Runs a dev tools startup, wants to demo at next year''s event.')
) as c(name, email, phone, notes)
where e.id = (select id from public.events order by created_at desc limit 1);

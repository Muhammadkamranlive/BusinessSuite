-- Platform landing / marketing images (Super Admin editable, not per-tenant).
-- Single-row JSON map of slot → image URL (path, https, or data URL).

create table if not exists public.platform_landing_media (
  id smallint primary key default 1 check (id = 1),
  media jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.platform_landing_media (id, media)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

alter table public.platform_landing_media enable row level security;

-- Platform config: only service role / secret key writes via API (no end-user policies).
-- Authenticated read optional for future; public site uses Next.js API.

comment on table public.platform_landing_media is
  'Super Admin overrides for marketing landing page images (slot → URL).';

-- Public storage bucket for uploaded landing screenshots
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'landing-media',
  'landing-media',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'landing_media_public_read'
  ) then
    create policy landing_media_public_read on storage.objects
      for select
      using (bucket_id = 'landing-media');
  end if;
end
$$;

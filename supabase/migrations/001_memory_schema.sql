create extension if not exists pgcrypto;

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  name text not null,
  created_at timestamptz not null default now()
);

alter table companies
  add column if not exists external_id text;

alter table companies
  drop constraint if exists companies_name_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'companies_external_id_key'
  ) then
    alter table companies add constraint companies_external_id_key unique (external_id);
  end if;
end $$;

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  company_id uuid not null references companies(id) on delete cascade,
  name text,
  phone text,
  city text,
  state text,
  source text,
  category text,
  credit_value text,
  entry_value text,
  status text,
  created_at timestamptz not null default now()
);

alter table leads
  add column if not exists external_id text,
  add column if not exists state text,
  add column if not exists source text,
  add column if not exists status text;

alter table leads
  alter column name drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leads_external_id_key'
  ) then
    alter table leads add constraint leads_external_id_key unique (external_id);
  end if;
end $$;

create index if not exists leads_company_id_idx
  on leads(company_id);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  company_id uuid not null references companies(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  consultant_id text,
  consultant_name text,
  status text,
  result text,
  started_at timestamptz,
  updated_at timestamptz,
  created_at timestamptz not null default now()
);

alter table conversations
  add column if not exists external_id text,
  add column if not exists consultant_id text,
  add column if not exists started_at timestamptz,
  add column if not exists updated_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'conversations_external_id_key'
  ) then
    alter table conversations add constraint conversations_external_id_key unique (external_id);
  end if;
end $$;

create index if not exists conversations_company_id_idx
  on conversations(company_id);

create index if not exists conversations_lead_id_idx
  on conversations(lead_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_type text,
  message_text text,
  created_at timestamptz not null default now()
);

alter table messages
  add column if not exists external_id text,
  add column if not exists sender_type text,
  add column if not exists message_text text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_name = 'messages' and column_name = 'sender'
  ) then
    alter table messages alter column sender drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_name = 'messages' and column_name = 'message'
  ) then
    alter table messages alter column message drop not null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'messages_external_id_key'
  ) then
    alter table messages add constraint messages_external_id_key unique (external_id);
  end if;
end $$;

create index if not exists messages_conversation_id_idx
  on messages(conversation_id);

create table if not exists conversation_results (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  status text,
  result text,
  loss_reason text,
  created_at timestamptz not null default now()
);

create index if not exists conversation_results_conversation_id_idx
  on conversation_results(conversation_id);

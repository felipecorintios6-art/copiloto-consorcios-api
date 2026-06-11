create extension if not exists pgcrypto;

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  phone text,
  city text,
  category text,
  credit_value text,
  entry_value text,
  created_at timestamptz not null default now()
);

create unique index if not exists leads_company_phone_unique
  on leads(company_id, phone)
  where phone is not null and phone <> '';

create index if not exists leads_company_name_idx
  on leads(company_id, name);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  consultant_name text,
  status text,
  result text,
  created_at timestamptz not null default now()
);

create index if not exists conversations_company_id_idx
  on conversations(company_id);

create index if not exists conversations_lead_id_idx
  on conversations(lead_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx
  on messages(conversation_id);

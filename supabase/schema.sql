create extension if not exists pgcrypto;

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  name text not null,
  created_at timestamptz not null default now()
);

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

create unique index if not exists leads_company_phone_unique
  on leads(company_id, phone)
  where phone is not null and phone <> '';

create index if not exists leads_company_name_idx
  on leads(company_id, name);

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

create table if not exists openrouter_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  model text not null default 'openrouter/free',
  api_key_encrypted text not null,
  key_preview text not null,
  status text not null default 'active',
  priority integer not null default 0,
  daily_limit integer not null default 100,
  daily_used integer not null default 0,
  daily_remaining integer not null default 100,
  concurrent_limit integer not null default 1,
  current_concurrent integer not null default 0,
  cooldown_until timestamptz,
  last_used_at timestamptz,
  reset_at timestamptz,
  tenant_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists openrouter_keys_tenant_status_idx
  on openrouter_keys(tenant_id, status);

create index if not exists openrouter_keys_capacity_idx
  on openrouter_keys(status, daily_remaining, priority);

create table if not exists openrouter_key_usage_logs (
  id uuid primary key default gen_random_uuid(),
  key_id uuid references openrouter_keys(id) on delete set null,
  tenant_id text,
  endpoint text,
  status text not null,
  error_code text,
  error_message text,
  tokens_input integer,
  tokens_output integer,
  estimated_cost numeric,
  created_at timestamptz not null default now()
);

create index if not exists openrouter_key_usage_logs_key_id_idx
  on openrouter_key_usage_logs(key_id, created_at desc);

create index if not exists openrouter_key_usage_logs_tenant_idx
  on openrouter_key_usage_logs(tenant_id, created_at desc);

create table if not exists ai_request_queue (
  id uuid primary key default gen_random_uuid(),
  tenant_id text,
  endpoint text not null,
  payload jsonb not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  scheduled_for timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_request_queue_status_scheduled_idx
  on ai_request_queue(status, scheduled_for);

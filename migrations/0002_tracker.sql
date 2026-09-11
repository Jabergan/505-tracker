create table if not exists job (
  id text primary key,
  name text not null,
  address text not null,
  city text not null default '',
  beds integer not null default 0,
  baths_tenths integer not null default 0,
  sqft integer not null default 0,
  stories integer not null default 1,
  land_cost_cents bigint not null default 0,
  target_sale_cents bigint not null default 0,
  start_date date,
  target_close_date date,
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists categories (
  id text primary key,
  name text not null,
  sort_order integer not null,
  kind text not null
);

create table if not exists line_items (
  id serial primary key,
  category_id text not null references categories(id),
  name text not null,
  vendor text not null default '',
  original_budget_cents bigint not null default 0,
  committed_cents bigint not null default 0,
  actual_cents bigint not null default 0,
  pct_complete integer not null default 0,
  notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists line_items_category_idx on line_items (category_id, sort_order, id);

create table if not exists payments (
  id serial primary key,
  line_item_id integer not null references line_items(id) on delete cascade,
  paid_on date not null,
  amount_cents bigint not null,
  payee text not null default '',
  method text not null default 'check',
  memo text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists payments_item_idx on payments (line_item_id);
create index if not exists payments_paid_on_idx on payments (paid_on desc);

create table if not exists change_orders (
  id serial primary key,
  line_item_id integer references line_items(id) on delete set null,
  title text not null,
  amount_cents bigint not null,
  status text not null default 'pending',
  reason text not null default '',
  created_at timestamptz not null default now()
);

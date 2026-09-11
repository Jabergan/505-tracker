-- Each job file owns its lines and change orders. Categories stay shared
-- (same trade list on every house).

alter table line_items add column if not exists job_id text;
alter table change_orders add column if not exists job_id text;

update line_items
set job_id = (select id from job order by updated_at desc limit 1)
where job_id is null;

update change_orders
set job_id = (select id from job order by updated_at desc limit 1)
where job_id is null;

create index if not exists line_items_job_idx on line_items (job_id, category_id, sort_order, id);
create index if not exists change_orders_job_idx on change_orders (job_id, created_at desc, id);

create table if not exists app_state (
  key text primary key,
  value text not null
);

insert into app_state (key, value)
select 'current_job_id', id from job
order by updated_at desc
limit 1
on conflict (key) do nothing;

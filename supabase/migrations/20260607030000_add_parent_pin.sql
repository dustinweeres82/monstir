-- Parent PIN gate: guards switching from a kid profile into parent view.
alter table public.profiles
  add column if not exists parent_pin text,
  add column if not exists parent_pin_enabled boolean not null default false;

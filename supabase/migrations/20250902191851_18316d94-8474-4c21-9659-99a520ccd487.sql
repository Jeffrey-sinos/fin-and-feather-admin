
-- 1) Create enum for application roles (admin, moderator, user)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'moderator', 'user');
  end if;
end$$;

-- 2) Create user_roles table (no FK to auth.users to avoid reserved schema coupling)
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Allow users to view their own roles
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_roles' and policyname = 'Users can view their own roles'
  ) then
    create policy "Users can view their own roles"
      on public.user_roles
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end$$;

-- Only service role can insert/update/delete roles
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_roles' and policyname = 'Service role can manage roles'
  ) then
    create policy "Service role can manage roles"
      on public.user_roles
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end$$;

-- 3) Helper function to check roles (SECURITY DEFINER to bypass RLS inside function)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

-- 4) Admin SELECT policies for dashboard-related tables

-- orders: allow admins to view all
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'orders' and policyname = 'Admins can view all orders'
  ) then
    create policy "Admins can view all orders"
      on public.orders
      for select
      to authenticated
      using (public.has_role(auth.uid(), 'admin'));
  end if;
end$$;

-- order_items: allow admins to view all
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'order_items' and policyname = 'Admins can view all order items'
  ) then
    create policy "Admins can view all order items"
      on public.order_items
      for select
      to authenticated
      using (public.has_role(auth.uid(), 'admin'));
  end if;
end$$;

-- profiles: allow admins to view all profiles
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Admins can view all profiles'
  ) then
    create policy "Admins can view all profiles"
      on public.profiles
      for select
      to authenticated
      using (public.has_role(auth.uid(), 'admin'));
  end if;
end$$;

-- newsletter_subscriptions: allow admins to view all
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'newsletter_subscriptions' and policyname = 'Admins can view all newsletter subscriptions'
  ) then
    create policy "Admins can view all newsletter subscriptions"
      on public.newsletter_subscriptions
      for select
      to authenticated
      using (public.has_role(auth.uid(), 'admin'));
  end if;
end$$;

-- blog_posts: allow admins to view all (beyond published = true)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'blog_posts' and policyname = 'Admins can view all blog posts'
  ) then
    create policy "Admins can view all blog posts"
      on public.blog_posts
      for select
      to authenticated
      using (public.has_role(auth.uid(), 'admin'));
  end if;
end$$;

-- contact_numbers: allow admins to view all
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'contact_numbers' and policyname = 'Admins can view all contact numbers'
  ) then
    create policy "Admins can view all contact numbers"
      on public.contact_numbers
      for select
      to authenticated
      using (public.has_role(auth.uid(), 'admin'));
  end if;
end$$;

-- 5) Optional: After your intended admin signs up, run this to grant admin role by email:
-- Replace with your admin email before running.
-- insert into public.user_roles (user_id, role)
-- select id, 'admin'::public.app_role
-- from auth.users
-- where email = 'admin@yourdomain.com'
-- on conflict (user_id, role) do nothing;

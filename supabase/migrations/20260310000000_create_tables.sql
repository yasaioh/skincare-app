-- ============================================================
-- 1. users（プロフィール情報）
-- ============================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  skin_type text check (skin_type in ('oily', 'dry', 'combination', 'sensitive', 'normal')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users: select own" on public.users
  for select using (auth.uid() = id);

create policy "users: insert own" on public.users
  for insert with check (auth.uid() = id);

create policy "users: update own" on public.users
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "users: delete own" on public.users
  for delete using (auth.uid() = id);

-- ============================================================
-- 2. products（製品マスタ）
-- ============================================================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  category text,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "products: anyone can read" on public.products
  for select using (true);

-- ============================================================
-- 3. ingredients（成分マスタ）
-- ============================================================
create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  name_ja text,
  description text,
  created_at timestamptz not null default now()
);

alter table public.ingredients enable row level security;

create policy "ingredients: anyone can read" on public.ingredients
  for select using (true);

-- ============================================================
-- 4. product_ingredients（製品×成分 中間テーブル）
-- ============================================================
create table public.product_ingredients (
  product_id uuid not null references public.products(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  position int,
  primary key (product_id, ingredient_id)
);

alter table public.product_ingredients enable row level security;

create policy "product_ingredients: anyone can read" on public.product_ingredients
  for select using (true);

-- ============================================================
-- 5. user_products（ユーザーの使用製品ログ）
-- ============================================================
create table public.user_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  started_at date,
  ended_at date,
  rating smallint check (rating between 1 and 5),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.user_products enable row level security;

create policy "user_products: select own" on public.user_products
  for select using (auth.uid() = user_id);

create policy "user_products: insert own" on public.user_products
  for insert with check (auth.uid() = user_id);

create policy "user_products: update own" on public.user_products
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_products: delete own" on public.user_products
  for delete using (auth.uid() = user_id);

-- ============================================================
-- 6. skin_logs（毎日の肌状態記録）
-- ============================================================
create table public.skin_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  logged_on date not null,
  condition smallint not null check (condition between 1 and 5),
  moisture smallint check (moisture between 1 and 5),
  oiliness smallint check (oiliness between 1 and 5),
  irritation smallint check (irritation between 0 and 5),
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, logged_on)
);

alter table public.skin_logs enable row level security;

create policy "skin_logs: select own" on public.skin_logs
  for select using (auth.uid() = user_id);

create policy "skin_logs: insert own" on public.skin_logs
  for insert with check (auth.uid() = user_id);

create policy "skin_logs: update own" on public.skin_logs
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "skin_logs: delete own" on public.skin_logs
  for delete using (auth.uid() = user_id);

-- ============================================================
-- 7. ingredient_preferences（成分相性スコアのキャッシュ）
-- ============================================================
create table public.ingredient_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  score numeric(3,2) not null check (score between -1 and 1),
  sample_count int not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, ingredient_id)
);

alter table public.ingredient_preferences enable row level security;

create policy "ingredient_preferences: select own" on public.ingredient_preferences
  for select using (auth.uid() = user_id);

create policy "ingredient_preferences: insert own" on public.ingredient_preferences
  for insert with check (auth.uid() = user_id);

create policy "ingredient_preferences: update own" on public.ingredient_preferences
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "ingredient_preferences: delete own" on public.ingredient_preferences
  for delete using (auth.uid() = user_id);

-- ============================================================
-- インデックス
-- ============================================================
create index idx_user_products_user_id on public.user_products(user_id);
create index idx_skin_logs_user_id_logged_on on public.skin_logs(user_id, logged_on);
create index idx_ingredient_preferences_user_id on public.ingredient_preferences(user_id);
create index idx_product_ingredients_ingredient_id on public.product_ingredients(ingredient_id);

-- ============================================================
-- updated_at 自動更新トリガー
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_users_updated
  before update on public.users
  for each row execute function public.handle_updated_at();

create trigger on_ingredient_preferences_updated
  before update on public.ingredient_preferences
  for each row execute function public.handle_updated_at();

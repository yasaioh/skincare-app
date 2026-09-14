-- ============================================================
-- スキンケアアプリ 初期スキーマ
--
-- 注意: 旧版はアプリのコード（src/types/database.types.ts, hooks, pages）と
--       テーブル名・カラム名が食い違っていたため、コード側に合わせて再定義した。
--       旧内容は git（コミット c78ea7f）から復元可能。
-- 方針: 全テーブルで RLS を有効化し、ユーザー個人のデータは user_id = auth.uid() に限定する。
--       products / ingredients は共有マスタのため、ログイン済みユーザーなら追加できる。
-- ============================================================

-- ============================================================
-- 1. profiles（プロフィール）
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  skin_type text check (skin_type in ('oily', 'dry', 'combination', 'sensitive', 'normal')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select own" on public.profiles
  for select to authenticated using (auth.uid() = id);

create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

create policy "profiles: update own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- 新規ユーザー登録時に profiles を自動作成する
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. products（製品マスタ・全ユーザー共有）
-- ============================================================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  category text,
  image_url text,
  jan_code text,
  created_at timestamptz not null default now(),
  -- 同じ製品の重複登録を防ぐ（brand が NULL でも重複とみなす）
  constraint products_name_brand_key unique nulls not distinct (name, brand)
);

alter table public.products enable row level security;

create policy "products: select all" on public.products
  for select to authenticated using (true);

-- プロトタイプでは自分で製品マスタを追加できるようにする
create policy "products: insert authenticated" on public.products
  for insert to authenticated with check (true);

create policy "products: update authenticated" on public.products
  for update to authenticated using (true) with check (true);

-- ============================================================
-- 3. ingredients（成分マスタ・全ユーザー共有）
-- ============================================================
create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name_ja text not null unique,
  name_inci text,
  description text,
  created_at timestamptz not null default now()
);

alter table public.ingredients enable row level security;

create policy "ingredients: select all" on public.ingredients
  for select to authenticated using (true);

create policy "ingredients: insert authenticated" on public.ingredients
  for insert to authenticated with check (true);

-- ============================================================
-- 4. product_ingredients（製品×成分 中間テーブル）
-- order_index は全成分表示順（1 が先頭 = 配合量が多い）
-- ============================================================
create table public.product_ingredients (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  order_index int,
  unique (product_id, ingredient_id)
);

alter table public.product_ingredients enable row level security;

create policy "product_ingredients: select all" on public.product_ingredients
  for select to authenticated using (true);

create policy "product_ingredients: insert authenticated" on public.product_ingredients
  for insert to authenticated with check (true);

create policy "product_ingredients: delete authenticated" on public.product_ingredients
  for delete to authenticated using (true);

-- ============================================================
-- 5. user_products（ユーザーが使用中の製品）
-- ============================================================
create table public.user_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  status text not null default 'using' check (status in ('using', 'stopped', 'planned')),
  started_at date,
  memo text,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table public.user_products enable row level security;

create policy "user_products: select own" on public.user_products
  for select to authenticated using (auth.uid() = user_id);

create policy "user_products: insert own" on public.user_products
  for insert to authenticated with check (auth.uid() = user_id);

create policy "user_products: update own" on public.user_products
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_products: delete own" on public.user_products
  for delete to authenticated using (auth.uid() = user_id);

-- ============================================================
-- 6. skin_logs（毎日の肌状態記録）
-- ============================================================
create table public.skin_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_at date not null,
  score smallint check (score between 1 and 5),
  memo text,
  created_at timestamptz not null default now(),
  unique (user_id, logged_at)
);

alter table public.skin_logs enable row level security;

create policy "skin_logs: select own" on public.skin_logs
  for select to authenticated using (auth.uid() = user_id);

create policy "skin_logs: insert own" on public.skin_logs
  for insert to authenticated with check (auth.uid() = user_id);

create policy "skin_logs: update own" on public.skin_logs
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "skin_logs: delete own" on public.skin_logs
  for delete to authenticated using (auth.uid() = user_id);

-- ============================================================
-- インデックス
-- ============================================================
create index idx_user_products_user_id on public.user_products(user_id);
create index idx_skin_logs_user_id_logged_at on public.skin_logs(user_id, logged_at desc);
create index idx_product_ingredients_ingredient_id on public.product_ingredients(ingredient_id);

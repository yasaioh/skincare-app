-- ============================================================
-- 肌ログと「そのとき使った製品」を結びつける
--
-- 成分の相性解析のため、肌ログ 1 件ごとに使用した製品（複数可）を記録する。
-- 記録は任意。製品を選ばなかった肌ログは解析の対象外になる。
-- ============================================================

-- 使ったタイミングごとに記録できるよう、1 日 1 件の制約を外す
alter table public.skin_logs
  drop constraint skin_logs_user_id_logged_at_key;

create table public.skin_log_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  skin_log_id uuid not null references public.skin_logs(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (skin_log_id, product_id)
);

alter table public.skin_log_products enable row level security;

create policy "skin_log_products: select own" on public.skin_log_products
  for select to authenticated using (auth.uid() = user_id);

-- 他人の肌ログに製品を結びつけられないよう、ログの持ち主も確認する
create policy "skin_log_products: insert own" on public.skin_log_products
  for insert to authenticated with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.skin_logs l
      where l.id = skin_log_id and l.user_id = auth.uid()
    )
  );

create policy "skin_log_products: delete own" on public.skin_log_products
  for delete to authenticated using (auth.uid() = user_id);

create index idx_skin_log_products_skin_log_id on public.skin_log_products(skin_log_id);

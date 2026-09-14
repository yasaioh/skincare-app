-- ============================================================
-- 商品検索 API から登録する製品の重複防止
--
-- Yahoo!ショッピング API は JAN コードを返すため、これを一意キーにして
-- 同じ製品が複数行できるのを防ぐ。
-- NULL は互いに重複とみなされないので、JAN が取れない製品は従来どおり
-- products_name_brand_key（name + brand）で重複を防ぐ。
-- ============================================================
alter table public.products
  add constraint products_jan_code_key unique (jan_code);

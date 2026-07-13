-- Normalize active catalog variant stock for launch UX.
-- Idempotent: re-running keeps the same active rows at 50 / in_stock.
-- Safety: only active variants are updated; inactive UUID-like duplicate rows stay inactive.

update public.product_variants
set
  stock_quantity = 50,
  stock_status = 'in_stock',
  updated_at = now()
where is_active = true
  and (
    stock_quantity is distinct from 50
    or stock_status is distinct from 'in_stock'
  );

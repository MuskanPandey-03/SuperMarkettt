/*
# Tighten table grants and function execute permissions

1. Security changes
- Revoke all default table privileges from anon on all application tables.
- Revoke UPDATE and DELETE on stock_movements from authenticated (append-only table; no update/delete policies exist).
- Revoke EXECUTE on all SECURITY DEFINER functions from anon, keeping execute for authenticated only.

2. Important notes
- RLS already blocks anon access since all policies are TO authenticated.
- These grant revocations add defense-in-depth by removing unused table-level grants.
- No data is modified or lost.
*/

REVOKE ALL ON TABLE profiles FROM anon;
REVOKE ALL ON TABLE categories FROM anon;
REVOKE ALL ON TABLE products FROM anon;
REVOKE ALL ON TABLE stock_movements FROM anon;
REVOKE ALL ON TABLE sales FROM anon;
REVOKE ALL ON TABLE sale_items FROM anon;

REVOKE UPDATE, DELETE ON TABLE stock_movements FROM authenticated;

REVOKE EXECUTE ON FUNCTION is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION create_sale(jsonb, numeric, text) FROM anon;
REVOKE EXECUTE ON FUNCTION adjust_product_stock(uuid, integer, text, text) FROM anon;

/*
# Allow admins to identify cashiers in sales history

1. Modified Tables
- `profiles`: add an admin-only SELECT policy so administrators can see staff display names when reviewing sales.

2. Security
- Existing self-read policy remains unchanged.
- The new policy is restricted to authenticated users whose profile role is `admin` through the existing `is_admin()` security-definer helper.
- Cashiers continue to see only their own profile and their own sales.

3. Important Notes
- No profile data is changed.
- No write permissions are added.
*/

DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT TO authenticated
  USING (is_admin());

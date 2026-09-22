import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Role = 'admin' | 'cashier';

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  stock: number;
  reorder_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface StockMovement {
  id: string;
  product_id: string;
  changed_by: string;
  change_type: 'purchase' | 'adjustment' | 'sale';
  quantity: number;
  note: string | null;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Sale {
  id: string;
  invoice_number: string;
  cashier_id: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: 'cash' | 'card' | 'mobile';
  status: string;
  created_at: string;
  sale_items?: SaleItem[];
  cashier?: Profile;
}

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
}

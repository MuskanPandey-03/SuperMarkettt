import { useEffect, useState } from 'react';
import { DollarSign, ShoppingCart, Package, AlertTriangle, TrendingUp, Boxes } from 'lucide-react';
import { supabase, Product, Sale } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';

interface Stats {
  todayRevenue: number;
  todaySalesCount: number;
  totalProducts: number;
  lowStockCount: number;
}

export function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [salesRes, productsRes] = await Promise.all([
        supabase
          .from('sales')
          .select('id, invoice_number, total, created_at, payment_method')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase.from('products').select('id, name, sku, stock, reorder_level, is_active, price'),
      ]);

      const allSales = (salesRes.data || []) as Sale[];
      const allProducts = (productsRes.data || []) as Product[];

      const todaySales = allSales.filter((s) => new Date(s.created_at) >= startOfDay);
      const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.total), 0);
      const lowStockProducts = allProducts
        .filter((p) => p.is_active && p.stock <= p.reorder_level)
        .sort((a, b) => a.stock - b.stock);

      setStats({
        todayRevenue,
        todaySalesCount: todaySales.length,
        totalProducts: allProducts.filter((p) => p.is_active).length,
        lowStockCount: lowStockProducts.length,
      });
      setRecentSales(allSales.slice(0, 6));
      setLowStock(lowStockProducts.slice(0, 6));
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  const cards = [
    {
      label: "Today's Revenue",
      value: formatCurrency(stats?.todayRevenue || 0),
      icon: DollarSign,
      color: 'emerald',
    },
    {
      label: "Today's Sales",
      value: String(stats?.todaySalesCount || 0),
      icon: ShoppingCart,
      color: 'blue',
    },
    {
      label: 'Active Products',
      value: String(stats?.totalProducts || 0),
      icon: Package,
      color: 'slate',
    },
    {
      label: 'Low Stock Items',
      value: String(stats?.lowStockCount || 0),
      icon: AlertTriangle,
      color: 'amber',
    },
  ];

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Welcome back, {profile?.full_name.split(' ')[0]}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Here's what's happening at your store today.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
                </div>
                <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${colorMap[card.color]}`}>
                  <Icon size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-600" />
              <h3 className="font-semibold text-slate-900">Recent Sales</h3>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {recentSales.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">
                No sales recorded yet.
              </div>
            ) : (
              recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{sale.invoice_number}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(sale.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(sale.total)}</p>
                    <p className="text-xs text-slate-400 capitalize">{sale.payment_method}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Boxes size={18} className="text-amber-600" />
              <h3 className="font-semibold text-slate-900">Low Stock Alerts</h3>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {lowStock.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">
                All products are well stocked.
              </div>
            ) : (
              lowStock.map((product) => (
                <div key={product.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-400">{product.sku}</p>
                  </div>
                  <Badge variant={product.stock === 0 ? 'error' : 'warning'}>
                    {product.stock} in stock
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Boxes, Plus, Minus, Search, TrendingUp, TrendingDown, History } from 'lucide-react';
import { supabase, Product, StockMovement } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Toast, LoadingPage, ErrorBanner } from '@/components/ui/Feedback';
import { formatCurrency, formatDateTime } from '@/lib/format';

export function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pageError, setPageError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState<'purchase' | 'adjustment'>('purchase');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    const [prodRes, moveRes] = await Promise.all([
      supabase
        .from('products')
        .select('*, category:categories(id, name)')
        .order('name', { ascending: true }),
      supabase
        .from('stock_movements')
        .select('*, product:products(id, name)')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);
    if (prodRes.error) setPageError('Could not load inventory.');
    setProducts((prodRes.data || []) as Product[]);
    setMovements((moveRes.data || []) as StockMovement[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const openAdjust = (product: Product) => {
    setAdjustTarget(product);
    setAdjustQty('');
    setAdjustType('purchase');
    setAdjustNote('');
    setAdjustError(null);
  };

  const handleAdjust = async () => {
    if (!adjustTarget) return;
    setAdjustError(null);
    const qty = parseInt(adjustQty);
    if (isNaN(qty) || qty === 0) return setAdjustError('Enter a valid non-zero quantity.');
    if (adjustTarget.stock + qty < 0) return setAdjustError('Resulting stock cannot be negative.');

    setSaving(true);
    const { error } = await supabase.rpc('adjust_product_stock', {
      p_product_id: adjustTarget.id,
      p_quantity: qty,
      p_change_type: adjustType,
      p_note: adjustNote.trim() || null,
    });
    setSaving(false);
    if (error) {
      setAdjustError('Could not update stock. Please try again.');
      return;
    }
    showToast('Stock updated successfully.');
    setAdjustTarget(null);
    load();
  };

  const openHistory = (product: Product) => {
    setHistoryProduct(product);
    setHistoryOpen(true);
  };

  const filteredProducts = products.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const productMovements = historyProduct
    ? movements.filter((m) => m.product_id === historyProduct.id)
    : [];

  if (loading) return <LoadingPage />;

  const totalStockValue = products.reduce((sum, p) => sum + Number(p.price) * p.stock, 0);
  const lowStockCount = products.filter((p) => p.is_active && p.stock <= p.reorder_level).length;
  const outOfStockCount = products.filter((p) => p.is_active && p.stock === 0).length;

  return (
    <div className="space-y-5">
      {pageError && <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} />}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total Stock Value</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalStockValue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-sm text-slate-500">Low Stock Items</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{lowStockCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-sm text-slate-500">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{outOfStockCount}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search size={18} />}
          className="flex-1 sm:max-w-xs"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredProducts.length === 0 ? (
          <EmptyState icon={<Boxes size={24} />} title="No products found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-center">Current Stock</th>
                  <th className="px-4 py-3 text-center">Reorder At</th>
                  <th className="px-4 py-3 text-right">Stock Value</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{product.name}</p>
                      <p className="text-xs text-slate-400">{product.category?.name}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{product.sku}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={
                          product.stock === 0 ? 'error' : product.stock <= product.reorder_level ? 'warning' : 'success'
                        }
                      >
                        {product.stock}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">{product.reorder_level}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                      {formatCurrency(Number(product.price) * product.stock)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openAdjust(product)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                        >
                          <Plus size={14} /> Adjust
                        </button>
                        <button
                          onClick={() => openHistory(product)}
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <History size={14} /> History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!adjustTarget}
        onClose={() => !saving && setAdjustTarget(null)}
        title="Adjust Stock"
        size="sm"
      >
        {adjustTarget && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="font-medium text-slate-900">{adjustTarget.name}</p>
              <p className="text-sm text-slate-500 mt-0.5">
                Current stock: <span className="font-semibold">{adjustTarget.stock}</span>
              </p>
            </div>

            <Select
              label="Change type"
              value={adjustType}
              onChange={(e) => setAdjustType(e.target.value as 'purchase' | 'adjustment')}
            >
              <option value="purchase">Purchase (restock)</option>
              <option value="adjustment">Adjustment (correction)</option>
            </Select>

            <Input
              label="Quantity change"
              type="number"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              placeholder="e.g. 50 to add, -5 to remove"
            />
            <p className="text-xs text-slate-400 -mt-2">
              Use a positive number to add stock or a negative number to remove.
            </p>

            <Textarea
              label="Note (optional)"
              rows={2}
              value={adjustNote}
              onChange={(e) => setAdjustNote(e.target.value)}
              placeholder="e.g. Received from supplier ABC"
            />

            {adjustError && <ErrorBanner message={adjustError} />}

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setAdjustTarget(null)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleAdjust} loading={saving}>
                Save Adjustment
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={`Stock History — ${historyProduct?.name || ''}`}
        size="md"
      >
        {productMovements.length === 0 ? (
          <EmptyState icon={<History size={24} />} title="No stock movements yet" />
        ) : (
          <div className="space-y-2">
            {productMovements.map((move) => (
              <div
                key={move.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                      move.quantity > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {move.quantity > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 capitalize">{move.change_type}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(move.created_at)}</p>
                    {move.note && <p className="text-xs text-slate-500 mt-0.5">{move.note}</p>}
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold ${move.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {move.quantity > 0 ? '+' : ''}{move.quantity}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast} />}
    </div>
  );
}

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, Receipt, X, Barcode } from 'lucide-react';
import { supabase, Product, CartItem, Sale } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Toast, ErrorBanner } from '@/components/ui/Feedback';
import { formatCurrency, formatDateTime } from '@/lib/format';

type PaymentMethod = 'cash' | 'card' | 'mobile';

export function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [receiptItems, setReceiptItems] = useState<CartItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [prodRes, catRes] = await Promise.all([
      supabase
        .from('products')
        .select('*, category:categories(id, name)')
        .eq('is_active', true)
        .order('name', { ascending: true }),
      supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
    ]);
    setProducts((prodRes.data || []) as Product[]);
    setCategories((catRes.data || []) as { id: string; name: string }[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.includes(search);
      const matchCat = categoryFilter === 'all' || p.category_id === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [products, search, categoryFilter]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: Number(product.price),
          quantity: 1,
          stock: product.stock,
        },
      ];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id !== productId) return item;
          const newQty = item.quantity + delta;
          if (newQty > item.stock) return item;
          return { ...item, quantity: newQty };
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const setQty = (productId: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id !== productId) return item;
          const clamped = Math.min(Math.max(qty, 0), item.stock);
          return { ...item, quantity: clamped };
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const subtotal = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.quantity, 0), [cart]);
  const discountValue = Math.min(Math.max(parseFloat(discount) || 0, 0), subtotal);
  const total = subtotal - discountValue;

  const handleBarcodeSearch = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const found = products.find(
      (p) => p.barcode === search.trim() || p.sku.toLowerCase() === search.trim().toLowerCase()
    );
    if (found) {
      addToCart(found);
      setSearch('');
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    setPageError(null);

    const items = cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity }));
    const { data, error } = await supabase.rpc('create_sale', {
      p_items: items,
      p_discount: discountValue,
      p_payment_method: paymentMethod,
    });

    setProcessing(false);

    if (error || !data) {
      setPageError('Could not complete the sale. ' + (error?.message || 'Please try again.'));
      return;
    }

    const { data: saleData } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .eq('id', data)
      .maybeSingle();

    const sale = saleData as Sale | null;
    setCompletedSale(sale);
    setReceiptItems([...cart]);
    setCart([]);
    setDiscount('');
    setCheckoutOpen(false);
    showToast('Sale completed successfully!');
    load();
  };

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-full">
      <div className="flex-1 flex flex-col min-w-0">
        {pageError && <div className="mb-4"><ErrorBanner message={pageError} onDismiss={() => setPageError(null)} /></div>}

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            placeholder="Search product or scan barcode + Enter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleBarcodeSearch}
            icon={<Search size={18} />}
          />
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="sm:max-w-48"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-600 border-t-transparent" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <EmptyState
              icon={<Barcode size={24} />}
              title="No products found"
              description="Try a different search or add products to your catalog."
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pb-4">
            {filteredProducts.map((product) => {
              const inCart = cart.find((i) => i.product_id === product.id);
              const out = product.stock <= 0;
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={out}
                  className={`relative bg-white rounded-xl border shadow-sm p-4 text-left transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                    inCart ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-slate-200'
                  }`}
                >
                  {inCart && (
                    <span className="absolute top-2 right-2 h-6 min-w-6 px-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                      {inCart.quantity}
                    </span>
                  )}
                  <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                    <ShoppingCart size={20} />
                  </div>
                  <h4 className="text-sm font-medium text-slate-900 line-clamp-2 leading-snug">{product.name}</h4>
                  <p className="text-xs text-slate-400 mt-1 font-mono">{product.sku}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-base font-bold text-slate-900">{formatCurrency(product.price)}</span>
                    <span
                      className={`text-xs font-medium ${
                        out ? 'text-red-600' : product.stock <= product.reorder_level ? 'text-amber-600' : 'text-slate-500'
                      }`}
                    >
                      {out ? 'Out' : `${product.stock} left`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="lg:w-96 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-emerald-600" />
            <h3 className="font-semibold text-slate-900">Cart</h3>
            {cartCount > 0 && (
              <span className="h-5 min-w-5 px-1.5 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-10 text-center">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 mb-3">
                <ShoppingCart size={24} />
              </div>
              <p className="text-sm text-slate-400">Cart is empty</p>
              <p className="text-xs text-slate-400 mt-1">Click a product to add it.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.product_id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500">{formatCurrency(item.price)} each</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.product_id, -1)}
                      className="h-7 w-7 rounded-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => setQty(item.product_id, parseInt(e.target.value) || 0)}
                      className="w-10 h-7 text-center text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      onClick={() => updateQty(item.product_id, 1)}
                      disabled={item.quantity >= item.stock}
                      className="h-7 w-7 rounded-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="text-right w-20">
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.price * item.quantity)}</p>
                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm gap-2">
              <span className="text-slate-500">Discount</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0.00"
                  className="w-20 h-8 text-right text-sm border border-slate-200 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="text-xl font-bold text-emerald-600">{formatCurrency(total)}</span>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={() => setCheckoutOpen(true)}
            >
              <Receipt size={18} /> Checkout
            </Button>
          </div>
        )}
      </div>

      <Modal
        open={checkoutOpen}
        onClose={() => !processing && setCheckoutOpen(false)}
        title="Complete Sale"
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Items</span>
              <span className="font-medium text-slate-900">{cartCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Discount</span>
              <span className="font-medium text-slate-900">-{formatCurrency(discountValue)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="text-lg font-bold text-emerald-600">{formatCurrency(total)}</span>
            </div>
          </div>

          <Select
            label="Payment method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="mobile">Mobile Pay</option>
          </Select>

          {pageError && <ErrorBanner message={pageError} />}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setCheckoutOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleCheckout} loading={processing}>
              Confirm Sale
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!completedSale}
        onClose={() => setCompletedSale(null)}
        title="Sale Receipt"
        size="sm"
      >
        {completedSale && (
          <div className="space-y-4">
            <div className="text-center pb-4 border-b border-dashed border-slate-200">
              <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white mx-auto mb-2">
                <Receipt size={24} />
              </div>
              <h3 className="font-bold text-slate-900">FreshMart</h3>
              <p className="text-xs text-slate-400 mt-1">{completedSale.invoice_number}</p>
              <p className="text-xs text-slate-400">{formatDateTime(completedSale.created_at)}</p>
            </div>

            <div className="space-y-2">
              {receiptItems.map((item) => (
                <div key={item.product_id} className="flex justify-between text-sm">
                  <span className="text-slate-700">
                    {item.quantity}× {item.name}
                  </span>
                  <span className="font-medium text-slate-900">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-200 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="text-slate-900">{formatCurrency(Number(completedSale.subtotal))}</span>
              </div>
              {Number(completedSale.discount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Discount</span>
                  <span className="text-slate-900">-{formatCurrency(Number(completedSale.discount))}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1">
                <span className="text-slate-900">Total</span>
                <span className="text-emerald-600">{formatCurrency(Number(completedSale.total))}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 pt-1">
                <span>Paid by</span>
                <span className="capitalize">{completedSale.payment_method}</span>
              </div>
            </div>

            <Button className="w-full" onClick={() => setCompletedSale(null)}>
              New Sale
            </Button>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast} />}
    </div>
  );
}

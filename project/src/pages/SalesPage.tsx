import { useEffect, useState, useCallback } from 'react';
import { History, Eye, Receipt } from 'lucide-react';
import { supabase, Sale, SaleItem } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingPage, ErrorBanner } from '@/components/ui/Feedback';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDateTime } from '@/lib/format';

export function SalesPage() {
  const { profile } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [viewItems, setViewItems] = useState<SaleItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    let query = supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (profile?.role === 'cashier') {
      query = query.eq('cashier_id', profile.id);
    }
    const { data, error } = await query;
    if (error) setPageError('Could not load sales history.');
    setSales((data || []) as Sale[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (sale: Sale) => {
    setViewSale(sale);
    setViewItems([]);
    setLoadingDetail(true);
    const { data } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', sale.id)
      .order('id', { ascending: true });
    setViewItems((data || []) as SaleItem[]);
    setLoadingDetail(false);
  };

  if (loading) return <LoadingPage />;

  return (
    <div className="space-y-5">
      {pageError && <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} />}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {sales.length === 0 ? (
          <EmptyState
            icon={<History size={24} />}
            title="No sales yet"
            description="Completed sales will appear here with full receipt details."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Date</th>
                  {profile?.role === 'admin' && <th className="px-4 py-3">Cashier</th>}
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                  <th className="px-4 py-3 text-right">Discount</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-900">
                      {sale.invoice_number}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(sale.created_at)}</td>
                    {profile?.role === 'admin' && (
                      <td className="px-4 py-3 text-slate-500">
                        <Badge variant="info">{sale.cashier_id === profile?.id ? 'You' : 'Staff'}</Badge>
                      </td>
                    )}
                    <td className="px-4 py-3 text-slate-600 capitalize">{sale.payment_method}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(sale.subtotal)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {Number(sale.discount) > 0 ? `-${formatCurrency(sale.discount)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(sale.total)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openDetail(sale)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!viewSale}
        onClose={() => setViewSale(null)}
        title="Sale Details"
        size="sm"
      >
        {viewSale && (
          <div className="space-y-4">
            <div className="text-center pb-4 border-b border-dashed border-slate-200">
              <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white mx-auto mb-2">
                <Receipt size={24} />
              </div>
              <h3 className="font-bold text-slate-900">FreshMart</h3>
              <p className="text-xs text-slate-400 mt-1">{viewSale.invoice_number}</p>
              <p className="text-xs text-slate-400">{formatDateTime(viewSale.created_at)}</p>
            </div>

            {loadingDetail ? (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-2">
                {viewItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-slate-700">
                      {item.quantity}× {item.product_name}
                    </span>
                    <span className="font-medium text-slate-900">{formatCurrency(Number(item.line_total))}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-dashed border-slate-200 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="text-slate-900">{formatCurrency(Number(viewSale.subtotal))}</span>
              </div>
              {Number(viewSale.discount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Discount</span>
                  <span className="text-slate-900">-{formatCurrency(Number(viewSale.discount))}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1">
                <span className="text-slate-900">Total</span>
                <span className="text-emerald-600">{formatCurrency(Number(viewSale.total))}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 pt-1">
                <span>Paid by</span>
                <span className="capitalize">{viewSale.payment_method}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

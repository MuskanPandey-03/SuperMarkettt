import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Pencil, Package, Trash2, AlertCircle } from 'lucide-react';
import { supabase, Product, Category } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog, Toast, LoadingPage, ErrorBanner } from '@/components/ui/Feedback';
import { formatCurrency } from '@/lib/format';

interface FormData {
  name: string;
  category_id: string;
  sku: string;
  barcode: string;
  price: string;
  stock: string;
  reorder_level: string;
  is_active: boolean;
}

const emptyForm: FormData = {
  name: '',
  category_id: '',
  sku: '',
  barcode: '',
  price: '',
  stock: '',
  reorder_level: '10',
  is_active: true,
};

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    const [prodRes, catRes] = await Promise.all([
      supabase
        .from('products')
        .select('*, category:categories(id, name, is_active)')
        .order('name', { ascending: true }),
      supabase.from('categories').select('*').order('name', { ascending: true }),
    ]);
    if (prodRes.error) setPageError('Could not load products. Please try again.');
    setProducts((prodRes.data || []) as Product[]);
    setCategories((catRes.data || []) as Category[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, category_id: categories[0]?.id || '' });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      category_id: product.category_id,
      sku: product.sku,
      barcode: product.barcode,
      price: String(product.price),
      stock: String(product.stock),
      reorder_level: String(product.reorder_level),
      is_active: product.is_active,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError(null);

    if (form.name.trim().length < 2) return setFormError('Product name is required.');
    if (!form.category_id) return setFormError('Please select a category.');
    if (form.sku.trim().length < 2) return setFormError('SKU is required.');
    if (form.barcode.trim().length < 2) return setFormError('Barcode is required.');
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) return setFormError('Price must be a valid positive number.');
    const stock = parseInt(form.stock);
    if (isNaN(stock) || stock < 0) return setFormError('Stock must be a valid non-negative integer.');
    const reorder = parseInt(form.reorder_level);
    if (isNaN(reorder) || reorder < 0) return setFormError('Reorder level must be a valid non-negative integer.');

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category_id: form.category_id,
      sku: form.sku.trim(),
      barcode: form.barcode.trim(),
      price,
      stock,
      reorder_level: reorder,
      is_active: form.is_active,
    };

    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
      setSaving(false);
      if (error) {
        setFormError(
          error.code === '23505' ? 'SKU or barcode already exists.' : 'Could not save product. Please try again.'
        );
        return;
      }
      showToast('Product updated successfully.');
    } else {
      const { error } = await supabase.from('products').insert(payload);
      setSaving(false);
      if (error) {
        setFormError(
          error.code === '23505' ? 'SKU or barcode already exists.' : 'Could not create product. Please try again.'
        );
        return;
      }
      showToast('Product created successfully.');
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('products').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      setPageError('Could not delete product. It may be referenced by existing sales.');
      setDeleteTarget(null);
      return;
    }
    showToast('Product deleted.');
    setDeleteTarget(null);
    load();
  };

  const filtered = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === 'all' || p.category_id === categoryFilter;
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.is_active) ||
      (statusFilter === 'inactive' && !p.is_active);
    return matchSearch && matchCategory && matchStatus;
  });

  if (loading) return <LoadingPage />;

  return (
    <div className="space-y-5">
      {pageError && <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search by name, SKU, or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={18} />}
            className="sm:max-w-xs"
          />
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="sm:max-w-48"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="sm:max-w-40"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus size={18} /> Add Product
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Package size={24} />}
            title="No products found"
            description="Add your first product to start building your catalog."
            action={<Button onClick={openCreate}><Plus size={18} /> Add Product</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-center">Stock</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{product.name}</td>
                    <td className="px-4 py-3 text-slate-600">{product.category?.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{product.sku}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          product.stock === 0
                            ? 'bg-red-100 text-red-700'
                            : product.stock <= product.reorder_level
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {product.stock <= product.reorder_level && <AlertCircle size={12} />}
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={product.is_active ? 'success' : 'default'}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(product)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(product)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
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
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Product' : 'Add Product'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Product name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Organic Bananas"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            >
              <option value="" disabled>Select a category</option>
              {categories.filter((c) => c.is_active).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Input
              label="SKU"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="e.g. BAN-001"
            />
          </div>
          <Input
            label="Barcode"
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            placeholder="e.g. 2900001234567"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Price ($)"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="0.00"
            />
            <Input
              label="Stock"
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              placeholder="0"
            />
            <Input
              label="Reorder level"
              type="number"
              min="0"
              value={form.reorder_level}
              onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
              placeholder="10"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-slate-700">Active (available for sale)</span>
          </label>

          {formError && <ErrorBanner message={formError} />}

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>
              {editing ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete product?"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      {toast && <Toast message={toast} />}
    </div>
  );
}

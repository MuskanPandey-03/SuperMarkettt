import { useEffect, useState, useCallback } from 'react';
import { Plus, Tags, Pencil, Trash2 } from 'lucide-react';
import { supabase, Category } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog, Toast, LoadingPage, ErrorBanner } from '@/components/ui/Feedback';
import { formatDate } from '@/lib/format';

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    const [catRes, prodRes] = await Promise.all([
      supabase.from('categories').select('*').order('name', { ascending: true }),
      supabase.from('products').select('category_id'),
    ]);
    if (catRes.error) setPageError('Could not load categories.');
    const cats = (catRes.data || []) as Category[];
    const productCounts: Record<string, number> = {};
    (prodRes.data || []).forEach((p: { category_id: string }) => {
      productCounts[p.category_id] = (productCounts[p.category_id] || 0) + 1;
    });
    setCategories(cats);
    setCounts(productCounts);
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
    setName('');
    setIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setIsActive(cat.is_active);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError(null);
    if (name.trim().length < 2) return setFormError('Category name is required.');
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from('categories')
        .update({ name: name.trim(), is_active: isActive })
        .eq('id', editing.id);
      setSaving(false);
      if (error) {
        setFormError(error.code === '23505' ? 'A category with this name already exists.' : 'Could not save category.');
        return;
      }
      showToast('Category updated.');
    } else {
      const { error } = await supabase.from('categories').insert({ name: name.trim(), is_active: isActive });
      setSaving(false);
      if (error) {
        setFormError(error.code === '23505' ? 'A category with this name already exists.' : 'Could not create category.');
        return;
      }
      showToast('Category created.');
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('categories').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      setPageError('Cannot delete this category because it has products assigned to it.');
      setDeleteTarget(null);
      return;
    }
    showToast('Category deleted.');
    setDeleteTarget(null);
    load();
  };

  if (loading) return <LoadingPage />;

  return (
    <div className="space-y-5">
      {pageError && <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} />}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{categories.length} categor{categories.length === 1 ? 'y' : 'ies'}</p>
        <Button onClick={openCreate}><Plus size={18} /> Add Category</Button>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <EmptyState
            icon={<Tags size={24} />}
            title="No categories yet"
            description="Create categories to organize your products."
            action={<Button onClick={openCreate}><Plus size={18} /> Add Category</Button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Tags size={18} />
                </div>
                <Badge variant={cat.is_active ? 'success' : 'default'}>
                  {cat.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <h3 className="font-semibold text-slate-900">{cat.name}</h3>
              <p className="text-sm text-slate-500 mt-1">
                {counts[cat.id] || 0} product{(counts[cat.id] || 0) === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-slate-400 mt-2">Created {formatDate(cat.created_at)}</p>
              <div className="flex items-center gap-1 mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => openEdit(cat)}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(cat)}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Category' : 'Add Category'}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dairy & Eggs"
            autoFocus
          />
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-slate-700">Active</span>
          </label>
          {formError && <ErrorBanner message={formError} />}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>
              {editing ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete category?"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Categories with products cannot be deleted.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      {toast && <Toast message={toast} />}
    </div>
  );
}

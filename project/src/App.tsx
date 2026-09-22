import { FormEvent, useEffect, useState } from 'react';
import { createClient, User } from '@supabase/supabase-js';
import {
  BarChart3, Boxes, Check, CircleDollarSign, Eye, History,
  LayoutDashboard, LogOut, Menu, Minus, Package, Pencil, Plus, Receipt,
  ShoppingBag, ShoppingCart, Tags, Trash2, X,
} from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

type Role = 'admin' | 'cashier';
type Page = 'dashboard' | 'pos' | 'sales' | 'products' | 'categories' | 'inventory';

interface Product {
  id: string; category_id: string; name: string; sku: string; barcode: string;
  price: number; stock: number; reorder_level: number; is_active: boolean;
  category?: { name: string };
}
interface Category { id: string; name: string; is_active: boolean; created_at: string }
interface CartItem extends Product { quantity: number }
interface Profile { id: string; full_name: string; role: Role }
interface Sale {
  id: string; invoice_number: string; cashier_id: string; subtotal: number;
  discount: number; total: number; payment_method: string; status: string;
  created_at: string;
}

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);

const dateTime = (v: string) =>
  new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

/* ---------- Shared UI ---------- */

function Button({
  children, onClick, variant = 'primary', className = '', disabled = false, type = 'button',
}: {
  children: React.ReactNode; onClick?: () => void; variant?: string;
  className?: string; disabled?: boolean; type?: 'button' | 'submit';
}) {
  const styles: Record<string, string> = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    dark: 'bg-slate-900 text-white hover:bg-slate-800',
    outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`h-10 px-4 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

function Field({
  label, value, onChange, placeholder, type = 'text', className = '',
}: {
  label?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</span>}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
    </label>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Toast({ message }: { message: string }) {
  return <div className="fixed bottom-5 right-5 z-[60] rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">{message}</div>;
}

/* ---------- Auth ---------- */

function Auth({ onReady }: { onReady: () => void }) {
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('cashier');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    if (signup) {
      if (name.trim().length < 2) { setError('Please enter your full name.'); setBusy(false); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); setBusy(false); return; }
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: name, role } },
      });
      if (error) { setError('Could not create account. Please check your details.'); setBusy(false); return; }
      if (data.user) {
        const { error: pe } = await supabase.from('profiles').insert({ id: data.user.id, full_name: name.trim(), role });
        if (pe) { setError('Could not finish registration. Please try again.'); setBusy(false); return; }
        onReady();
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError('Incorrect email or password.'); setBusy(false); return; }
      onReady();
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <div className="hidden lg:flex lg:w-[48%] bg-emerald-700 p-16 text-white flex-col justify-center">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center"><ShoppingBag /></div>
          <b className="text-2xl">FreshMart</b>
        </div>
        <h1 className="text-5xl font-extrabold leading-tight">Run your store with clarity.</h1>
        <p className="mt-5 max-w-md text-lg leading-8 text-emerald-50/80">
          A focused supermarket management system for inventory, checkout and sales — built for the people who keep the shelves moving.
        </p>
        <div className="mt-10 space-y-3 text-sm text-emerald-50/90">
          <p>✓ Real-time inventory and low-stock alerts</p>
          <p>✓ Fast, barcode-friendly checkout</p>
          <p>✓ Secure admin and cashier access</p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="h-10 w-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center"><ShoppingBag size={20} /></div>
            <b className="text-xl">FreshMart</b>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{signup ? 'Create your account' : 'Welcome back'}</h2>
          <p className="mt-1 text-sm text-slate-500">{signup ? 'Set up your store access.' : 'Sign in to continue to your store.'}</p>
          <div className="mt-6 space-y-4">
            {signup && <Field label="Full name" value={name} onChange={setName} placeholder="Alex Morgan" />}
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@store.com" />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" />
            {signup && (
              <div>
                <span className="block text-xs font-semibold text-slate-600 mb-1.5">Role</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['cashier', 'admin'] as Role[]).map((r) => (
                    <button type="button" key={r} onClick={() => setRole(r)}
                      className={`h-10 rounded-lg border text-sm font-semibold capitalize ${role === r ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-600'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full">{busy ? 'Working...' : signup ? 'Create account' : 'Sign in'}</Button>
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            {signup ? 'Already have an account?' : 'Need an account?'}{' '}
            <button type="button" onClick={() => { setSignup(!signup); setError(''); }}
              className="font-semibold text-emerald-600">{signup ? 'Sign in' : 'Sign up'}</button>
          </p>
        </form>
      </div>
    </div>
  );
}

/* ---------- Shell ---------- */

function Shell({ page, setPage, profile, onSignOut, children }: {
  page: Page; setPage: (p: Page) => void; profile: Profile; onSignOut: () => void; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const items: { id: Page; label: string; icon: React.ReactNode; admin?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'pos', label: 'Point of Sale', icon: <ShoppingCart size={18} /> },
    { id: 'sales', label: 'Sales History', icon: <History size={18} /> },
    { id: 'products', label: 'Products', icon: <Package size={18} />, admin: true },
    { id: 'categories', label: 'Categories', icon: <Tags size={18} />, admin: true },
    { id: 'inventory', label: 'Inventory', icon: <Boxes size={18} />, admin: true },
  ];
  const visible = items.filter((i) => !i.admin || profile.role === 'admin');

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 text-slate-300 transition-transform lg:sticky lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 border-b border-white/10 px-5 flex items-center gap-3 text-white">
          <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center"><ShoppingBag size={19} /></div>
          <b className="text-lg">FreshMart</b>
        </div>
        <nav className="p-3 space-y-1">
          {visible.map((i) => (
            <button key={i.id} onClick={() => { setPage(i.id); setOpen(false); }}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${page === i.id ? 'bg-emerald-600 text-white' : 'hover:bg-white/10'}`}>
              {i.icon}{i.label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white">{profile.full_name[0]}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{profile.full_name}</p>
              <p className="text-xs capitalize text-slate-400">{profile.role}</p>
            </div>
          </div>
          <button onClick={onSignOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/10">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-7">
          <button onClick={() => setOpen(!open)} className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"><Menu size={20} /></button>
          <h1 className="text-lg font-bold text-slate-900">{items.find((i) => i.id === page)?.label}</h1>
          <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-bold">{profile.full_name[0]}</div>
        </header>
        <main className="mx-auto max-w-[1440px] p-4 lg:p-7">{children}</main>
      </div>
    </div>
  );
}

/* ---------- Dashboard ---------- */

function Dashboard({ setPage }: { setPage: (p: Page) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [p, s] = await Promise.all([
        supabase.from('products').select('id,name,stock,reorder_level,is_active,price'),
        supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(100),
      ]);
      setProducts((p.data || []) as Product[]);
      setSales((s.data || []) as Sale[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="py-20 text-center text-slate-400">Loading dashboard...</div>;

  const start = startOfToday();
  const daySales = sales.filter((s) => new Date(s.created_at) >= start);
  const revenue = daySales.reduce((a, s) => a + Number(s.total), 0);
  const low = products.filter((p) => p.is_active && p.stock <= p.reorder_level);
  const totalStock = products.reduce((a, p) => a + p.stock, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i));
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const value = sales
      .filter((s) => new Date(s.created_at) >= d && new Date(s.created_at) < next)
      .reduce((a, s) => a + Number(s.total), 0);
    return { label: d.toLocaleDateString('en-US', { weekday: 'short' }), value };
  });
  const maxBar = Math.max(...days.map((d) => d.value), 1);

  const cards = [
    { label: 'Total Products', value: String(products.filter((p) => p.is_active).length), icon: <Package size={19} />, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Stock', value: String(totalStock), icon: <Boxes size={19} />, color: 'text-slate-600 bg-slate-100' },
    { label: "Today's Sales", value: money(revenue), icon: <CircleDollarSign size={19} />, color: 'text-emerald-600 bg-emerald-50' },
    { label: "Today's Transactions", value: String(daySales.length), icon: <ShoppingCart size={19} />, color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">Good morning</h2>
        <p className="mt-1 text-sm text-slate-500">Here is your store at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-slate-500">{c.label}</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">{c.value}</p>
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${c.color}`}>{c.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">Last 7 days sales</h3>
              <p className="text-xs text-slate-500 mt-1">Revenue by day</p>
            </div>
            <BarChart3 size={19} className="text-emerald-600" />
          </div>
          <div className="mt-7 flex h-48 items-end gap-3">
            {days.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="relative flex h-36 w-full items-end">
                  <div title={money(d.value)}
                    style={{ height: `${Math.max(6, (d.value / maxBar) * 100)}%` }}
                    className="w-full rounded-t-md bg-emerald-500 transition-all hover:bg-emerald-600" />
                </div>
                <span className="text-xs text-slate-500">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="font-bold text-slate-900">Low stock products</h3>
            <button onClick={() => setPage('inventory')} className="text-xs font-semibold text-emerald-600">View all</button>
          </div>
          {low.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">Everything is well stocked.</p>
          ) : (
            <div className="divide-y">
              {low.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">Reorder at {p.reorder_level}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${p.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {p.stock} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="font-bold text-slate-900">Recent transactions</h3>
          <button onClick={() => setPage('sales')} className="text-xs font-semibold text-emerald-600">View history</button>
        </div>
        {sales.slice(0, 5).map((s) => (
          <div key={s.id} className="flex items-center justify-between border-b px-5 py-3 last:border-0">
            <div>
              <p className="font-mono text-xs font-bold text-slate-800">{s.invoice_number}</p>
              <p className="text-xs text-slate-400">{dateTime(s.created_at)}</p>
            </div>
            <p className="font-bold text-slate-900">{money(s.total)}</p>
          </div>
        ))}
        {sales.length === 0 && <p className="p-8 text-center text-sm text-slate-400">No sales recorded yet.</p>}
      </div>
    </div>
  );
}

/* ---------- Products ---------- */

function Products({ categories }: { categories: Category[] }) {
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [editing, setEditing] = useState<Product | null>(null);
  const [toast, setToast] = useState('');

  const load = async () => {
    const { data } = await supabase.from('products').select('*,category:categories(name)').order('name');
    setItems((data || []) as Product[]);
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(
    (p) =>
      (!q || `${p.name} ${p.sku} ${p.barcode}`.toLowerCase().includes(q.toLowerCase())) &&
      (cat === 'all' || p.category_id === cat)
  );

  const remove = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    setToast('Product removed');
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <Field value={q} onChange={setQ} placeholder="Search product, SKU or barcode" />
          <select value={cat} onChange={(e) => setCat(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm">
            <option value="all">All categories</option>
            {categories.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}
          </select>
        </div>
        <Button onClick={() => setEditing({ id: '', category_id: categories[0]?.id || '', name: '', sku: '', barcode: '', price: 0, stock: 0, reorder_level: 10, is_active: true })}>
          <Plus size={17} /> Add product
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">SKU / barcode</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-center">Stock</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                <td className="px-4 py-3 text-slate-500">{p.category?.name || '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.sku}<br />{p.barcode}</td>
                <td className="px-4 py-3 text-right font-semibold">{money(p.price)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${p.stock === 0 ? 'bg-red-100 text-red-700' : p.stock <= p.reorder_level ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                    {p.stock}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setEditing(p)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil size={16} /></button>
                    <button onClick={() => remove(p.id)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-12 text-center text-sm text-slate-400">No products found.</p>}
      </div>

      {editing && (
        <ProductModal item={editing} categories={categories} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); setToast('Product saved'); }} />
      )}
      {toast && <Toast message={toast} />}
    </div>
  );
}

function ProductModal({ item, categories, onClose, onSaved }: {
  item: Product; categories: Category[]; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState({
    name: item.name, category_id: item.category_id, sku: item.sku, barcode: item.barcode,
    price: String(item.price || ''), stock: String(item.stock || ''),
    reorder_level: String(item.reorder_level || 10), is_active: item.is_active,
  });

  const save = async () => {
    const payload = {
      ...f, name: f.name.trim(),
      price: Number(f.price), stock: Number(f.stock), reorder_level: Number(f.reorder_level),
    };
    if (!payload.name || !payload.category_id || !payload.sku || !payload.barcode || payload.price < 0 || payload.stock < 0) return;
    const result = item.id
      ? await supabase.from('products').update(payload).eq('id', item.id)
      : await supabase.from('products').insert(payload);
    if (!result.error) onSaved();
  };

  return (
    <Modal title={item.id ? 'Edit product' : 'Add product'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Product name" value={f.name} onChange={(v) => setF({ ...f, name: v })} placeholder="Organic bananas" />
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="block text-xs font-semibold text-slate-600 mb-1.5">Category</span>
            <select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}
              className="h-10 w-full rounded-lg border px-3 text-sm">
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <Field label="SKU" value={f.sku} onChange={(v) => setF({ ...f, sku: v })} placeholder="BAN-001" />
        </div>
        <Field label="Barcode" value={f.barcode} onChange={(v) => setF({ ...f, barcode: v })} placeholder="2900001234567" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price" type="number" value={f.price} onChange={(v) => setF({ ...f, price: v })} />
          <Field label="Stock" type="number" value={f.stock} onChange={(v) => setF({ ...f, stock: v })} />
          <Field label="Reorder level" type="number" value={f.reorder_level} onChange={(v) => setF({ ...f, reorder_level: v })} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> Active product
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save product</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Categories ---------- */

function Categories({ onChange }: { onChange: () => void }) {
  const [items, setItems] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [toast, setToast] = useState('');

  const load = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    setItems((data || []) as Category[]);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.name.trim()) return;
    const r = editing.id
      ? await supabase.from('categories').update({ name: editing.name.trim(), is_active: editing.is_active }).eq('id', editing.id)
      : await supabase.from('categories').insert({ name: editing.name.trim(), is_active: editing.is_active });
    if (!r.error) { setEditing(null); load(); onChange(); setToast('Category saved'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ id: '', name: '', is_active: true, created_at: '' })}><Plus size={17} /> Add category</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex justify-between">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><Tags size={19} /></div>
              <span className={`h-fit rounded-full px-2 py-1 text-xs font-bold ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {c.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <h3 className="mt-4 font-bold text-slate-900">{c.name}</h3>
            <div className="mt-5 flex gap-2 border-t pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(c)}><Pencil size={14} /> Edit</Button>
              <Button variant="ghost" className="flex-1"
                onClick={async () => { await supabase.from('categories').update({ is_active: !c.is_active }).eq('id', c.id); load(); onChange(); }}>
                {c.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <Modal title={editing.id ? 'Edit category' : 'Add category'} onClose={() => setEditing(null)}>
          <div className="space-y-4">
            <Field label="Category name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} placeholder="Fresh produce" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active category
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save}>Save category</Button>
            </div>
          </div>
        </Modal>
      )}
      {toast && <Toast message={toast} />}
    </div>
  );
}

/* ---------- POS ---------- */

function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState('');
  const [payment, setPayment] = useState('cash');
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    const { data } = await supabase.from('products').select('*,category:categories(name)').eq('is_active', true).order('name');
    setProducts((data || []) as Product[]);
  };
  useEffect(() => { load(); }, []);

  const filtered = products.filter((p) => !q || `${p.name} ${p.sku} ${p.barcode}`.toLowerCase().includes(q.toLowerCase()));

  const add = (p: Product) => setCart((c) => {
    const existing = c.find((i) => i.id === p.id);
    if (existing) return c.map((i) => (i.id === p.id ? { ...i, quantity: Math.min(i.quantity + 1, p.stock) } : i));
    return p.stock ? [...c, { ...p, quantity: 1 }] : c;
  });

  const subtotal = cart.reduce((a, p) => a + p.price * p.quantity, 0);
  const disc = Math.min(Number(discount) || 0, subtotal);
  const total = subtotal - disc;

  const checkout = async () => {
    setError('');
    const { data, error } = await supabase.rpc('create_sale', {
      p_items: cart.map((i) => ({ product_id: i.id, quantity: i.quantity })),
      p_discount: disc, p_payment_method: payment,
    });
    if (error || !data) { setError('Sale could not be completed. Please check stock and try again.'); return; }
    const { data: sale } = await supabase.from('sales').select('*').eq('id', data).maybeSingle();
    setReceipt(sale as Sale);
    setCart([]);
    setDiscount('');
    load();
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_390px]">
      <div>
        <div className="mb-4 flex gap-3">
          <Field value={q} onChange={setQ} placeholder="Search or scan barcode" className="flex-1" />
          {q && <Button variant="outline" onClick={() => setQ('')}><X size={16} /></Button>}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <button key={p.id} onClick={() => add(p)} disabled={!p.stock}
              className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50">
              <div className="mb-3 h-10 w-10 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center"><Package size={18} /></div>
              <p className="line-clamp-2 text-sm font-bold text-slate-900">{p.name}</p>
              <p className="mt-1 text-xs text-slate-400">{p.sku}</p>
              <div className="mt-3 flex justify-between">
                <b>{money(p.price)}</b>
                <span className="text-xs text-slate-500">{p.stock} left</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="font-bold">Cart
            <span className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{cart.reduce((a, i) => a + i.quantity, 0)}</span>
          </h3>
          {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-red-500">Clear</button>}
        </div>
        <div className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              <ShoppingCart className="mx-auto mb-3" />
              <p>Your cart is empty.</p>
            </div>
          ) : cart.map((i) => (
            <div key={i.id} className="flex items-center gap-2 border-b py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{i.name}</p>
                <p className="text-xs text-slate-500">{money(i.price)}</p>
              </div>
              <button onClick={() => setCart((c) => c.map((x) => x.id === i.id ? { ...x, quantity: x.quantity - 1 } : x).filter((x) => x.quantity > 0))}
                className="rounded border p-1"><Minus size={13} /></button>
              <span className="w-5 text-center text-sm">{i.quantity}</span>
              <button onClick={() => add(i)} className="rounded border p-1"><Plus size={13} /></button>
              <b className="w-16 text-right text-sm">{money(i.price * i.quantity)}</b>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div className="border-t p-5 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><b>{money(subtotal)}</b></div>
            <Field label="Discount" type="number" value={discount} onChange={setDiscount} placeholder="0.00" />
            <div className="flex justify-between border-t pt-3"><b>Total</b><strong className="text-xl text-emerald-600">{money(total)}</strong></div>
            <select value={payment} onChange={(e) => setPayment(e.target.value)} className="h-10 w-full rounded-lg border px-3 text-sm">
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="mobile">Mobile pay</option>
            </select>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <Button className="w-full" onClick={checkout}><Receipt size={17} /> Complete sale</Button>
          </div>
        )}
      </div>

      {receipt && (
        <Modal title="Sale completed" onClose={() => setReceipt(null)}>
          <div className="text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center"><Check /></div>
            <p className="text-sm text-slate-500">Invoice number</p>
            <p className="mt-1 font-mono text-lg font-bold">{receipt.invoice_number}</p>
            <p className="mt-4 text-3xl font-extrabold text-emerald-600">{money(receipt.total)}</p>
            <p className="mt-1 text-sm capitalize text-slate-500">Paid by {receipt.payment_method}</p>
            <Button className="mt-6 w-full" onClick={() => setReceipt(null)}>Start new sale</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Sales ---------- */

function Sales({ role }: { role: Role }) {
  const [items, setItems] = useState<Sale[]>([]);
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const load = async () => {
    let query = supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(200);
    if (role === 'cashier') {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) query = query.eq('cashier_id', u.user.id);
    }
    const { data } = await query;
    setItems((data || []) as Sale[]);
  };
  useEffect(() => { load(); }, [role]);

  const filtered = items.filter(
    (s) =>
      (!q || s.invoice_number.toLowerCase().includes(q.toLowerCase())) &&
      (!from || s.created_at.slice(0, 10) >= from) &&
      (!to || s.created_at.slice(0, 10) <= to)
  );
  const pageItems = filtered.slice((page - 1) * 10, page * 10);
  const pages = Math.max(1, Math.ceil(filtered.length / 10));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
        <Field value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search invoice number" className="md:w-64" />
        <Field label="From" type="date" value={from} onChange={(v) => { setFrom(v); setPage(1); }} />
        <Field label="To" type="date" value={to} onChange={(v) => { setTo(v); setPage(1); }} />
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {pageItems.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs font-bold">{s.invoice_number}</td>
                <td className="px-4 py-3 text-slate-500">{dateTime(s.created_at)}</td>
                <td className="px-4 py-3 capitalize text-slate-600">{s.payment_method}</td>
                <td className="px-4 py-3 text-right font-bold">{money(s.total)}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">{s.status}</span></td>
                <td className="px-4 py-3 text-right"><button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Eye size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {pageItems.length === 0 && <p className="p-12 text-center text-sm text-slate-400">No sales match those filters.</p>}
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
          <span className="text-slate-500">{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Previous</Button>
            <span>{page} / {pages}</span>
            <Button variant="outline" onClick={() => setPage(Math.min(pages, page + 1))} disabled={page === pages}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Inventory ---------- */

function Inventory() {
  const [items, setItems] = useState<Product[]>([]);
  const [target, setTarget] = useState<Product | null>(null);
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');

  const load = async () => {
    const { data } = await supabase.from('products').select('*,category:categories(name)').order('name');
    setItems((data || []) as Product[]);
  };
  useEffect(() => { load(); }, []);

  const adjust = async () => {
    if (!target || !Number(qty)) return;
    await supabase.rpc('adjust_product_stock', {
      p_product_id: target.id, p_quantity: Number(qty),
      p_change_type: 'adjustment', p_note: note || null,
    });
    setTarget(null);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Products tracked</p>
          <p className="mt-1 text-2xl font-extrabold">{items.length}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Low stock</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-600">{items.filter((p) => p.stock <= p.reorder_level).length}</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Out of stock</p>
          <p className="mt-1 text-2xl font-extrabold text-red-600">{items.filter((p) => p.stock === 0).length}</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Current stock</th>
              <th className="px-4 py-3">Reorder at</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 font-semibold">{p.name}<p className="text-xs text-slate-400">{p.sku}</p></td>
                <td className="px-4 py-3"><span className={`font-bold ${p.stock <= p.reorder_level ? 'text-amber-600' : 'text-slate-800'}`}>{p.stock}</span></td>
                <td className="px-4 py-3 text-slate-500">{p.reorder_level}</td>
                <td className="px-4 py-3">
                  {p.stock === 0 ? <span className="text-xs font-bold text-red-600">Out of stock</span>
                    : p.stock <= p.reorder_level ? <span className="text-xs font-bold text-amber-600">Low stock</span>
                    : <span className="text-xs font-bold text-green-600">Healthy</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="outline" onClick={() => { setTarget(p); setQty(''); setNote(''); }}><Plus size={15} /> Adjust</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {target && (
        <Modal title={`Adjust stock — ${target.name}`} onClose={() => setTarget(null)}>
          <div className="space-y-4">
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              Current stock: <b>{target.stock}</b>. Use a positive value to add stock or a negative value to remove it.
            </p>
            <Field label="Quantity change" type="number" value={qty} onChange={setQty} placeholder="+25 or -2" />
            <Field label="Note" value={note} onChange={setNote} placeholder="Supplier delivery or correction" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
              <Button onClick={adjust}>Save adjustment</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- App ---------- */

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (u: User) => {
    setUser(u);
    const { data } = await supabase.from('profiles').select('*').eq('id', u.id).maybeSingle();
    setProfile(data as Profile | null);
    const { data: cats } = await supabase.from('categories').select('*').order('name');
    setCategories((cats || []) as Category[]);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) load(data.session.user);
      else setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) load(s.user);
      else { setUser(null); setProfile(null); setLoading(false); }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading FreshMart...</div>;
  if (!user || !profile) return <Auth onReady={() => supabase.auth.getUser().then(({ data }) => data.user && load(data.user))} />;

  const content =
    page === 'dashboard' ? <Dashboard setPage={setPage} /> :
    page === 'pos' ? <POS /> :
    page === 'sales' ? <Sales role={profile.role} /> :
    page === 'products' ? <Products categories={categories} /> :
    page === 'categories' ? <Categories onChange={async () => {
      const { data } = await supabase.from('categories').select('*').order('name');
      setCategories((data || []) as Category[]);
    }} /> :
    <Inventory />;

  return (
    <Shell page={page} setPage={setPage} profile={profile} onSignOut={() => supabase.auth.signOut()}>
      {content}
    </Shell>
  );
}

import { ReactNode, useState } from 'react';
import { ShoppingBag, LayoutDashboard, Package, Tags, ShoppingCart, History, LogOut, Menu, X, Boxes } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/lib/supabase';

export type Page = 'dashboard' | 'products' | 'categories' | 'pos' | 'sales' | 'inventory';

interface NavItem {
  id: Page;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'cashier'] },
  { id: 'pos', label: 'Point of Sale', icon: ShoppingCart, roles: ['admin', 'cashier'] },
  { id: 'sales', label: 'Sales History', icon: History, roles: ['admin', 'cashier'] },
  { id: 'products', label: 'Products', icon: Package, roles: ['admin'] },
  { id: 'categories', label: 'Categories', icon: Tags, roles: ['admin'] },
  { id: 'inventory', label: 'Inventory', icon: Boxes, roles: ['admin'] },
];

interface AppShellProps {
  current: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}

export function AppShell({ current, onNavigate, children }: AppShellProps) {
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!profile) return null;

  const items = navItems.filter((item) => item.roles.includes(profile.role));

  const handleNavigate = (page: Page) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-800">
          <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <ShoppingBag size={20} />
          </div>
          <span className="text-lg font-bold text-white">FreshMart</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = current === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold text-white">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{profile.full_name}</p>
              <p className="text-xs text-slate-400 capitalize">{profile.role}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h1 className="text-lg font-semibold text-slate-900 capitalize">
            {navItems.find((i) => i.id === current)?.label || 'Dashboard'}
          </h1>
          <div className="w-10 lg:hidden" />
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

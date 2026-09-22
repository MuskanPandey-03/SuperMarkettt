import { useState, FormEvent } from 'react';
import { ShoppingBag, Mail, Lock, User, UserCog } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Role } from '@/lib/supabase';

type Mode = 'signin' | 'signup';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('cashier');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signin') {
      const { error } = await signIn(email.trim(), password);
      if (error) setError(error === 'Invalid login credentials' ? 'Incorrect email or password.' : error);
    } else {
      if (fullName.trim().length < 2) {
        setError('Please enter your full name.');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email.trim(), password, fullName.trim(), role);
      if (error) setError(error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-emerald-700 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <ShoppingBag size={28} />
            </div>
            <span className="text-2xl font-bold tracking-tight">FreshMart</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            The modern POS and inventory system for your supermarket.
          </h1>
          <p className="text-lg text-emerald-50/80 mb-10 leading-relaxed">
            Track stock in real time, ring up sales at the register, and keep your shelves stocked — all from one clean dashboard.
          </p>
          <div className="space-y-4">
            {[
              'Real-time inventory with low-stock alerts',
              'Fast barcode-driven checkout flow',
              'Sales history and revenue reporting',
              'Role-based access for admins and cashiers',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold">
                  ✓
                </div>
                <span className="text-emerald-50/90">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <ShoppingBag size={24} />
            </div>
            <span className="text-xl font-bold text-slate-900">FreshMart</span>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              {mode === 'signin' ? 'Sign in to manage your store.' : 'Sign up to get started with FreshMart.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <Input
                  label="Full name"
                  name="fullName"
                  type="text"
                  placeholder="Jane Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  icon={<User size={18} />}
                  required
                />
              )}
              <Input
                label="Email"
                name="email"
                type="email"
                placeholder="you@store.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={18} />}
                required
              />
              <Input
                label="Password"
                name="password"
                type="password"
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock size={18} />}
                required
              />
              {mode === 'signup' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['cashier', 'admin'] as Role[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`flex items-center justify-center gap-2 h-11 rounded-lg border text-sm font-medium transition-colors ${
                          role === r
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                            : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {r === 'admin' ? <UserCog size={16} /> : <User size={16} />}
                        {r === 'admin' ? 'Admin' : 'Cashier'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setError(null);
                }}
                className="font-medium text-emerald-600 hover:text-emerald-700"
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

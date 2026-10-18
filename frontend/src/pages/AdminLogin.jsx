import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import PasswordField from '../components/PasswordField.jsx';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { adminLogin } = useAuth();
  const [form, setForm] = useState({
    email: 'admin@citeable.com',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    if (error) setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      return setError('Please enter both email and admin password.');
    }

    setLoading(true);
    setError('');

    try {
      await adminLogin(form.email, form.password);
      navigate('/admin');
    } catch (err) {
      if (err.status === 403 || err.code === 'forbidden_admin_only') {
        setError('Access denied: This portal is strictly for Superadmins. Regular customer accounts cannot access the admin console.');
      } else if (err.code === 'invalid_credentials' || err.status === 401) {
        setError('Invalid admin credentials. Please verify email and password.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-primary border border-primary/20">
            <Icon name="shield" size={16} /> Superadmin Portal
          </div>
          <span className="text-2xl font-bold tracking-tight text-on-surface">Administrative Sign In</span>
        </div>
      }
      subtitle="Authorized Citeable platform operators only. All access and actions are strictly audited."
      footer={
        <div className="flex flex-col items-center gap-2 text-center">
          <span>
            Are you a customer?{' '}
            <Link to="/login" className="link ml-1 font-semibold">
              Go to Customer Login
            </Link>
          </span>
          <span className="text-[11px] text-muted">
            Default credentials: <code className="bg-surface-container px-1 py-0.5 rounded text-primary">admin@citeable.com</code> / <code className="bg-surface-container px-1 py-0.5 rounded text-primary">Admin12345!</code>
          </span>
        </div>
      }
    >
      {error && (
        <div className="mb-4 rounded-xl border border-error/30 bg-error/10 p-3.5 text-[13px] text-error flex items-start gap-2.5">
          <Icon name="error" size={18} className="shrink-0 mt-0.5" />
          <div className="flex-1 leading-snug">{error}</div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="field-label" htmlFor="admin-email">
            Superadmin Email
          </label>
          <input
            id="admin-email"
            type="email"
            className="field-input"
            placeholder="admin@citeable.com"
            value={form.email}
            onChange={set('email')}
            autoComplete="email"
            required
          />
        </div>

        <PasswordField
          id="admin-password"
          placeholder="••••••••••••"
          value={form.password}
          onChange={set('password')}
          autoComplete="current-password"
          hint={<span className="text-[12px] text-muted">Superadmin master key</span>}
        />

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 font-bold shadow-md hover:shadow-lg transition-all"
          >
            {loading ? (
              <>
                <Icon name="sync" size={18} className="animate-spin" /> Authenticating...
              </>
            ) : (
              <>
                Access Admin Console <Icon name="admin_panel_settings" size={18} />
              </>
            )}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}

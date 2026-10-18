import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import PasswordField from '../components/PasswordField.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    if (error) setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      return setError('Please enter both your email and password.');
    }

    setLoading(true);
    setError('');

    try {
      const loggedInUser = await login(form.email, form.password);
      if (loggedInUser.is_superuser || loggedInUser.role === 'superadmin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      if (err.code === 'email_not_verified') {
        setError('Your email is not verified yet. Please check your inbox or verification link.');
      } else if (err.code === 'account_locked') {
        setError(err.message || 'Too many failed attempts. Account temporarily locked.');
      } else if (err.status === 401 || err.code === 'invalid_credentials') {
        setError('Invalid credentials. Check your email and password.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Monitor brand citations and share of voice across major AI models."
      footer={
        <div className="flex flex-col items-center gap-2 text-center">
          <div>
            Don't have an account?{' '}
            <Link to="/register" className="link ml-1 font-semibold">
              Sign up
            </Link>
          </div>
          <div className="pt-2 text-xs text-muted border-t border-surface-container w-full">
            Platform Administrator?{' '}
            <Link to="/admin/login" className="link font-bold text-primary ml-1 inline-flex items-center gap-1">
              <Icon name="shield" size={13} /> Superadmin Portal
            </Link>
          </div>
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
          <label className="field-label" htmlFor="email">Work email</label>
          <input
            id="email"
            type="email"
            className="field-input"
            placeholder="alex@company.com"
            value={form.email}
            onChange={set('email')}
            autoComplete="email"
            required
          />
        </div>

        <PasswordField
          id="password"
          placeholder="••••••••••••"
          value={form.password}
          onChange={set('password')}
          autoComplete="current-password"
          hint={<a href="#" onClick={(e) => { e.preventDefault(); alert('Password reset link is sent to email in production.'); }} className="link text-[13px]">Forgot password?</a>}
        />

        <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-muted">
          <input type="checkbox" defaultChecked className="h-4 w-4 accent-primary" /> Remember this browser (30 days)
        </label>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Icon name="sync" size={18} className="animate-spin" /> Logging in...
            </>
          ) : (
            <>
              Log in <Icon name="arrow_forward" size={18} />
            </>
          )}
        </button>
      </form>

      <div className="divider"><span>or continue with</span></div>
      <GoogleButton>Continue with Google</GoogleButton>
    </AuthLayout>
  );
}

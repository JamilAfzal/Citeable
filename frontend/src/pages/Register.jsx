import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import PasswordField from '../components/PasswordField.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { authApi } from '../api/client.js';

const strength = (p) => [p.length >= 8, /[A-Z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong password'];

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', terms: true });
  const [verifyToken, setVerifyToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
    if (error) setError('');
  };

  const score = strength(form.password);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return setError('Please fill in all fields.');
    if (score < 2) return setError('Password is too weak. Include uppercase, numbers or symbols.');
    if (!form.terms) return setError('Please agree to the Terms of Service.');

    setLoading(true);
    setError('');

    try {
      await register(form.name, form.email, form.password);
      setRegistered(true);
      setSuccess('Registration accepted! A verification link has been dispatched (check backend console in dev mode).');
    } catch (err) {
      setError(err.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verifyToken.trim()) return setError('Please enter your verification token.');
    setIsVerifying(true);
    setError('');

    try {
      await authApi.verifyEmail(verifyToken.trim());
      setSuccess('Email successfully verified! You can now log in.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message || 'Verification failed. Token may have expired.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <AuthLayout
      title="Start tracking your AI visibility"
      subtitle="See how ChatGPT, Perplexity and Gemini cite your brand."
      footer={<>Already have an account? <Link to="/login" className="link ml-1 font-semibold">Log in</Link></>}
    >
      {error && (
        <div className="mb-4 rounded-xl border border-error/30 bg-error/10 p-3.5 text-[13px] text-error flex items-start gap-2.5">
          <Icon name="error" size={18} className="shrink-0 mt-0.5" />
          <div className="flex-1 leading-snug">{error}</div>
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-xl border border-tertiary-fixed-dim/40 bg-tertiary-container/20 p-3.5 text-[13px] text-tertiary flex items-start gap-2.5">
          <Icon name="check_circle" size={18} className="shrink-0 mt-0.5 text-tertiary" />
          <div className="flex-1 leading-snug">{success}</div>
        </div>
      )}

      {registered ? (
        <div className="space-y-4">
          <div className="inset p-4 rounded-xl text-sm space-y-2">
            <p className="font-semibold text-on-surface">Verify your account:</p>
            <p className="text-muted text-xs">
              Check your backend terminal log for the verification token (printed by <code>EmailService</code> in dev mode), then paste it below:
            </p>
          </div>
          <form onSubmit={handleVerify} className="space-y-3">
            <div>
              <label className="field-label" htmlFor="token">Verification Token</label>
              <input
                id="token"
                className="field-input text-xs font-mono"
                placeholder="Paste verification token here"
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={isVerifying} className="btn-primary w-full flex items-center justify-center gap-2">
              {isVerifying ? 'Verifying...' : 'Verify & Continue to Login'}
            </button>
          </form>
          <div className="text-center pt-2">
            <Link to="/login" className="link text-xs">Back to Login</Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="field-label" htmlFor="name">Full name</label>
            <input
              id="name"
              className="field-input"
              placeholder="Sarah Jenkins"
              value={form.name}
              onChange={set('name')}
              required
            />
          </div>
          <div>
            <label className="field-label" htmlFor="email">Work email</label>
            <input
              id="email"
              type="email"
              className="field-input"
              placeholder="sarah@company.com"
              value={form.email}
              onChange={set('email')}
              required
            />
          </div>
          <div>
            <PasswordField
              id="password"
              placeholder="Create a secure password"
              value={form.password}
              onChange={set('password')}
              hint={<span className="text-[11px] text-outline">Minimum 8 characters</span>}
            />
            <div className="mt-2.5 grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full ${i <= score ? 'bg-tertiary-container' : 'bg-surface-container-highest'}`}
                />
              ))}
            </div>
            <p className="mt-1.5 text-[11px] font-medium text-tertiary">{labels[score]}</p>
          </div>
          <label className="flex cursor-pointer items-start gap-3 text-[13px] text-muted">
            <input
              type="checkbox"
              checked={form.terms}
              onChange={set('terms')}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span>
              I agree to the <a href="#" className="link">Terms of Service</a> and <a href="#" className="link">Privacy Policy</a>.
            </span>
          </label>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Icon name="sync" size={18} className="animate-spin" /> Creating account...
                </>
              ) : (
                <>
                  Create account <Icon name="arrow_forward" size={18} />
                </>
              )}
            </button>
            <p className="mt-2.5 text-center text-[11px] text-muted">Free 7-day trial, no credit card needed.</p>
          </div>
        </form>
      )}

      {!registered && (
        <>
          <div className="divider"><span>or continue with</span></div>
          <GoogleButton>Continue with Google</GoogleButton>
        </>
      )}
    </AuthLayout>
  );
}

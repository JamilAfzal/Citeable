import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import PasswordField from '../components/PasswordField.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import Icon from '../components/Icon.jsx';

const strength = (p) => [p.length >= 8, /[A-Z]/.test(p), /\d/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;
const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong password'];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', terms: true });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const score = strength(form.password);

  const submit = (e) => {
    e.preventDefault();
    if (score < 2 || !form.terms) return;
    navigate('/dashboard'); // TODO: replace with Laravel register call
  };

  return (
    <AuthLayout title="Start tracking your AI visibility" subtitle="See how ChatGPT, Perplexity and Gemini cite your brand."
      footer={<>Already have an account? <Link to="/login" className="link ml-1">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="field-label" htmlFor="name">Full name</label>
          <input id="name" className="field-input" placeholder="Sarah Jenkins" value={form.name} onChange={set('name')} />
        </div>
        <div>
          <label className="field-label" htmlFor="email">Work email</label>
          <input id="email" type="email" className="field-input" placeholder="sarah@company.com" value={form.email} onChange={set('email')} />
        </div>
        <div>
          <PasswordField id="password" placeholder="Create a secure password" value={form.password} onChange={set('password')}
            hint={<span className="text-[11px] text-outline">Minimum 8 characters</span>} />
          <div className="mt-2.5 grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-1.5 rounded-full ${i <= score ? 'bg-tertiary-container' : 'bg-surface-container-highest'}`} />
            ))}
          </div>
          <p className="mt-1.5 text-[11px] font-medium text-tertiary">{labels[score]}</p>
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-[13px] text-muted">
          <input type="checkbox" checked={form.terms} onChange={set('terms')} className="mt-0.5 h-4 w-4 accent-primary" />
          <span>I agree to the <a href="#" className="link">Terms of Service</a> and <a href="#" className="link">Privacy Policy</a>.</span>
        </label>
        <div>
          <button type="submit" className="btn-primary w-full">Create account <Icon name="arrow_forward" size={18} /></button>
          <p className="mt-2.5 text-center text-[11px] text-muted">Free 7-day trial, no credit card needed.</p>
        </div>
      </form>
      <div className="divider"><span>or continue with</span></div>
      <GoogleButton>Continue with Google</GoogleButton>
    </AuthLayout>
  );
}

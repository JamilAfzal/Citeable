import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import PasswordField from '../components/PasswordField.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import Icon from '../components/Icon.jsx';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    if (!form.email || form.password.length < 8) return setError('Invalid credentials. Check your password or reset it.');
    navigate('/dashboard'); // TODO: replace with Laravel auth call
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Monitor brand citations and share of voice across major AI models."
      footer={<>Don't have an account? <Link to="/register" className="link ml-1">Sign up</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="field-label" htmlFor="email">Work email</label>
          <input id="email" type="email" className="field-input" placeholder="alex@company.com" value={form.email} onChange={set('email')} />
        </div>
        <PasswordField id="password" placeholder="••••••••••••" value={form.password} onChange={set('password')} error={error}
          hint={<a href="#" className="link text-[13px]">Forgot password?</a>} />
        <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-muted">
          <input type="checkbox" defaultChecked className="h-4 w-4 accent-primary" /> Remember this browser (30 days)
        </label>
        <button type="submit" className="btn-primary w-full">Log in <Icon name="arrow_forward" size={18} /></button>
      </form>
      <div className="divider"><span>or continue with</span></div>
      <GoogleButton>Continue with Google</GoogleButton>
    </AuthLayout>
  );
}

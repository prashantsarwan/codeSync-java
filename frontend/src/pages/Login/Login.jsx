import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Code2 } from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';
import './Login.css';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { login } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data);
      toast.success('Welcome, ' + data.name);
      nav('/lobby');
    } catch (err) {
      toast.error((err.response && err.response.data && err.response.data.message) || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-wrap">
      <Link to="/" className="auth-logo">
        <Code2 size={22} color="#06B6D4" />
        <span>CodeSync</span>
      </Link>
      <div className="auth-card glass">
        <h2>Welcome Back</h2>
        <p className="auth-sub">Sign in to continue coding</p>
        <form onSubmit={submit} className="auth-form">
          <input className="input" type="email" placeholder="Email" required
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" type="password" placeholder="Password" required
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="auth-foot">No account? <Link to="/register">Create one</Link></p>
      </div>
    </div>
  );
}

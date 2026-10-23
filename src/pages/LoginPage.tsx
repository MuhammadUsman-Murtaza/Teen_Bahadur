import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getSupabaseClient } from '../lib/supabaseClient';
import { useProfile } from '../modules/profile/hooks';
import { useAuth } from '../modules/auth/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { profile } = useProfile();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        return;
      }

      if (!data.session) {
        setError('Please confirm your email before logging in.');
        return;
      }

      // Decide where to go based on whether a profile exists
      if (profile) {
        navigate('/app');
      } else {
        navigate('/onboarding');
      }
    } catch (e: any) {
      setError(e?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  if (user) {
    // Already signed in; redirect hint
    return (
      <div className="card">
        <p className="page-intro">You are already signed in.</p>
        <button className="button" onClick={() => navigate('/app')}>
          Go to app
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 className="page-title">Log in</h1>
      <p className="page-intro">Use the email and password you signed up with.</p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Log in'}
        </button>
      </form>
      <p className="helper" style={{ marginTop: '0.75rem' }}>
        New to OnRoute? <Link to="/signup">Create an account</Link>.
      </p>
    </div>
  );
};

export default LoginPage;

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getSupabaseClient } from '../lib/supabaseClient';

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!email || !username || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        return;
      }

      if (data.user && !data.session) {
        // Email confirmation required
        setInfo(
          'Account created. Please check your email to confirm your address, then come back to log in.'
        );
        return;
      }

      // Session available immediately – go to onboarding
      navigate('/onboarding');
    } catch (e: any) {
      setError(e?.message || 'Sign-up failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h1 className="page-title">Create your OnRoute account</h1>
      <p className="page-intro">
        Use your email and a password you control. Usernames are set during onboarding.
      </p>
      {error && <div className="error">{error}</div>}
      {info && <div className="helper">{info}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="username">Username</label>
          <input
            id="username"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <p className="helper">For Phase 0, your username is stored privately in your profile.</p>
        </div>
        <div className="field">
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="confirm">Confirm password</label>
          <input
            id="confirm"
            className="input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p className="helper" style={{ marginTop: '0.75rem' }}>
        Already have an account? <Link to="/login">Log in</Link>.
      </p>
    </div>
  );
};

export default SignUpPage;

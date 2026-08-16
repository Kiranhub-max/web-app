import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [mode, setMode] = useState('signIn'); // 'signIn' | 'signUp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signedUp, setSignedUp] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } =
      mode === 'signIn'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    if (mode === 'signUp') setSignedUp(true);
  }

  return (
    <div className="auth-screen">
      <div className="auth-card card">
        <h1 className="auth-title">Daily Progress</h1>
        <p className="auth-subtitle">
          {mode === 'signIn' ? 'Sign in to your tracker' : 'Create your account'}
        </p>

        {signedUp ? (
          <p style={{ fontSize: 14.5 }}>
            Check your email to confirm your account, then sign in.
          </p>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Please wait…' : mode === 'signIn' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
        )}

        {!signedUp && (
          <button
            className="auth-switch"
            onClick={() => {
              setMode(mode === 'signIn' ? 'signUp' : 'signIn');
              setError('');
            }}
          >
            {mode === 'signIn' ? "First time? Create an account" : 'Already have an account? Sign in'}
          </button>
        )}
      </div>
    </div>
  );
}

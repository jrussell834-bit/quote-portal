import React, { useState } from 'react';
import { KanbanApp } from './KanbanApp';
import { CustomersApp } from './CustomersApp';
import { login, register } from '../api';

type Mode = 'login' | 'register';
type View = 'kanban' | 'customers';

export const AuthApp: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>('kanban');

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      const action = mode === 'login' ? login : register;
      const res = await action(username, password);
      localStorage.setItem('auth_token', res.token);
      window.location.reload();
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err?.response?.data?.message || (mode === 'login' ? 'Login failed' : 'Registration failed');
      
      // More specific error messages
      if (err?.code === 'ECONNREFUSED' || err?.message?.includes('Network Error')) {
        msg = 'Cannot connect to server. Make sure the backend is running on port 4000.';
      } else if (err?.response?.status === 401) {
        msg = 'Invalid username or password';
      } else if (err?.response?.status === 400) {
        msg = err?.response?.data?.message || 'Please check your input';
      } else if (err?.response?.status === 503) {
        const dbError = err?.response?.data?.error || '';
        if (dbError.includes('PostgreSQL') || dbError.includes('Database connection')) {
          // Detect if we're on Railway (production)
          const isRailway = window.location.hostname.includes('railway.app') || 
                           window.location.hostname.includes('up.railway.app') ||
                           !window.location.hostname.includes('localhost');
          
          if (isRailway) {
            msg = 'Database not connected on Railway.';
            msg += ' Go to Railway dashboard → Your project → Click "+ New" → Add PostgreSQL database.';
            msg += ' Railway will automatically set DATABASE_URL. Then redeploy your service.';
          } else {
            msg = 'Database not connected. PostgreSQL is required to run this application.';
            msg += ' Please install Docker and run: docker compose up -d db';
            msg += ' OR install PostgreSQL locally and ensure it is running.';
          }
        } else {
          msg = err?.response?.data?.message || 'Service unavailable. Please check backend logs.';
        }
      } else if (err?.response?.status >= 500) {
        const serverMsg = err?.response?.data?.message || err?.response?.data?.error;
        const hint = err?.response?.data?.hint;
        msg = serverMsg || 'Server error occurred.';
        if (hint) {
          msg += ` ${hint}`;
        }
        if (!serverMsg) {
          msg += ' Check the backend console for details.';
        }
      }
      
      setAuthError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (token) {
    if (view === 'customers') {
      return <CustomersApp onNavigateToKanban={() => setView('kanban')} />;
    }
    return <KanbanApp onNavigateToCustomers={() => setView('customers')} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 text-center">
          <h1 className="text-lg font-semibold text-slate-900">Quote Pipeline</h1>
          <p className="text-xs text-slate-500">
            {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none ring-blue-500/0 transition focus:bg-white focus:ring-2"
              required
            />
          </label>
          {authError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {authError}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>
        <div className="mt-4 text-center text-xs text-slate-500">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};


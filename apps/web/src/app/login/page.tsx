'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = isSignUp ? 'ReachInbox - Create Account' : 'ReachInbox - Login';
  }, [isSignUp]);

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:4000/api/v1/auth/google';
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password');
      return;
    }

    if (isSignUp) {
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password should be at least 6 characters');
        return;
      }
    }

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/v1/auth/dev-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || (email.split('@')[0] ? email.split('@')[0].replace(/[._-]/g, ' ') : 'User'),
          isSignUp,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        router.push('/dashboard');
      } else {
        setErrorMsg(data.message || 'Authentication failed. Please verify your credentials.');
      }
    } catch {
      setErrorMsg('Unable to connect to authentication server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        fontFamily: "var(--font-inter), 'Inter', sans-serif",
        letterSpacing: '-0.15px',
      }}
      className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4 text-slate-900 relative overflow-hidden"
    >

      <div
        style={{
          fontFamily: "var(--font-inter), 'Inter', sans-serif",
          letterSpacing: '-0.15px',
          border: '1px solid rgba(0, 0, 0, 0.15)',
        }}
        className="w-full max-w-[440px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8 md:p-10 flex flex-col items-center relative z-10"
      >
        {/* SaaS Heading & Subtitle */}
        <div className="text-center mb-6">
          <h1
            style={{
              fontFamily: "var(--font-inter), 'Inter', sans-serif",
              letterSpacing: '-0.4px',
            }}
            className="text-[26px] font-bold text-slate-900 tracking-tight"
          >
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p
            style={{
              fontFamily: "var(--font-inter), 'Inter', sans-serif",
              fontSize: '13px',
              letterSpacing: '-0.15px',
            }}
            className="text-slate-500 mt-1.5"
          >
            {isSignUp
              ? 'Start scheduling cold emails and scale your outreach today.'
              : 'Enter your credentials to manage your email schedules.'}
          </p>
        </div>

        {/* Google Login button matching Figma */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          style={{
            fontFamily: "var(--font-inter), 'Inter', sans-serif",
            fontSize: '14px',
            letterSpacing: '-0.15px',
          }}
          className="w-full h-12 flex items-center justify-center gap-3 bg-[#E8F5E9] hover:bg-[#DDF0DF] text-[#1B5E20] font-medium rounded-xl transition duration-150 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.64v3.03h3.88c2.28-2.1 3.66-5.2 3.66-9.11z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.43 7.35 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.43l4.03-3.14z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.57 1.25 6.57l4.03 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
            />
          </svg>
          <span>{isSignUp ? 'Sign up with Google' : 'Login with Google'}</span>
        </button>

        {/* Divider */}
        <div className="w-full flex items-center my-6">
          <div className="flex-1 border-t border-slate-100"></div>
          <span
            style={{
              fontFamily: "var(--font-inter), 'Inter', sans-serif",
              fontSize: '12px',
              letterSpacing: '-0.15px',
            }}
            className="px-3 text-slate-400 font-normal"
          >
            {isSignUp ? 'or register with email' : 'or sign up through email'}
          </span>
          <div className="flex-1 border-t border-slate-100"></div>
        </div>

        {/* Error notification if passwords mismatch */}
        {errorMsg && (
          <div className="w-full mb-3 px-3.5 py-2 rounded-xl bg-red-50 border border-red-200/80 text-red-600 text-xs text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleAuthSubmit} className="w-full space-y-3.5">
          {isSignUp && (
            <div>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  fontFamily: "var(--font-inter), 'Inter', sans-serif",
                  fontSize: '14px',
                  letterSpacing: '-0.15px',
                }}
                className="w-full h-12 px-4 bg-[#F5F7F6] text-slate-800 placeholder-slate-400 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00A843] transition border border-transparent focus:bg-white"
              />
            </div>
          )}

          <div>
            <input
              type="email"
              required
              placeholder="Email ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                fontFamily: "var(--font-inter), 'Inter', sans-serif",
                fontSize: '14px',
                letterSpacing: '-0.15px',
              }}
              className="w-full h-12 px-4 bg-[#F5F7F6] text-slate-800 placeholder-slate-400 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00A843] transition border border-transparent focus:bg-white"
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                fontFamily: "var(--font-inter), 'Inter', sans-serif",
                fontSize: '14px',
                letterSpacing: '-0.15px',
              }}
              className="w-full h-12 pl-4 pr-11 bg-[#F5F7F6] text-slate-800 placeholder-slate-400 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00A843] transition border border-transparent focus:bg-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4 stroke-[1.75]" /> : <Eye className="w-4 h-4 stroke-[1.75]" />}
            </button>
          </div>

          {/* Verify Password Field (for Sign Up) */}
          {isSignUp && (
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                placeholder="Verify Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  fontFamily: "var(--font-inter), 'Inter', sans-serif",
                  fontSize: '14px',
                  letterSpacing: '-0.15px',
                }}
                className="w-full h-12 pl-4 pr-11 bg-[#F5F7F6] text-slate-800 placeholder-slate-400 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00A843] transition border border-transparent focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4 stroke-[1.75]" /> : <Eye className="w-4 h-4 stroke-[1.75]" />}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              fontFamily: "var(--font-inter), 'Inter', sans-serif",
              fontSize: '14px',
              letterSpacing: '-0.15px',
            }}
            className="w-full h-12 mt-2 bg-[#00A843] hover:bg-[#00923a] text-white font-medium rounded-xl shadow-[0_2px_8px_rgba(0,168,67,0.25)] transition duration-150 flex items-center justify-center cursor-pointer"
          >
            {loading ? (isSignUp ? 'Creating Account...' : 'Logging in...') : (isSignUp ? 'Create Account' : 'Login')}
          </button>
        </form>

        {/* Toggle between Login and Create Account at bottom */}
        <div
          style={{
            fontFamily: "var(--font-inter), 'Inter', sans-serif",
            fontSize: '13px',
            letterSpacing: '-0.15px',
          }}
          className="mt-6 pt-2 text-center text-slate-500"
        >
          {isSignUp ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMsg('');
                }}
                className="font-semibold text-[#00A843] hover:underline cursor-pointer ml-1"
              >
                Sign in
              </button>
            </p>
          ) : (
            <p>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMsg('');
                }}
                className="font-semibold text-[#00A843] hover:underline cursor-pointer ml-1"
              >
                Create an account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

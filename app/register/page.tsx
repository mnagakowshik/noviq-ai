'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { NoviqLogo } from '@/components/noviq-logo';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password) {
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

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          confirmPassword,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'Registration failed.');
      }

      // Registration successful and session cookie set -> go to chat
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#101522] text-[#F3F4F8] select-none">
      <div className="w-full max-w-md">
        {/* Logo and Greeting */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="mb-4 transform hover:scale-105 transition-transform duration-200">
            <NoviqLogo size="lg" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Create an account</h1>
          <p className="text-sm text-[#9DA8BE] mt-1.5">Start your intelligent conversations with Noviq AI</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-[#192030] border border-[#242D40] p-7 shadow-xl shadow-black/30 backdrop-blur-md">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#9DA8BE] mb-1.5">
                Full Name
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-[#647087] absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#101522] border border-[#242D40] text-sm text-white placeholder-[#647087] focus:outline-none focus:border-[#8B7CFF] focus:ring-1 focus:ring-[#8B7CFF] transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#9DA8BE] mb-1.5">
                Email address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-[#647087] absolute left-3.5 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#101522] border border-[#242D40] text-sm text-white placeholder-[#647087] focus:outline-none focus:border-[#8B7CFF] focus:ring-1 focus:ring-[#8B7CFF] transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#9DA8BE] mb-1.5">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-[#647087] absolute left-3.5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#101522] border border-[#242D40] text-sm text-white placeholder-[#647087] focus:outline-none focus:border-[#8B7CFF] focus:ring-1 focus:ring-[#8B7CFF] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1 text-[#647087] hover:text-[#9DA8BE] transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#9DA8BE] mb-1.5">
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-[#647087] absolute left-3.5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#101522] border border-[#242D40] text-sm text-white placeholder-[#647087] focus:outline-none focus:border-[#8B7CFF] focus:ring-1 focus:ring-[#8B7CFF] transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3 px-4 rounded-xl bg-[#8B7CFF] hover:bg-[#7867FB] disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-md shadow-[#8B7CFF]/20 hover:shadow-lg transition-all duration-150 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-6 pt-5 border-t border-[#242D40] text-center text-xs text-[#9DA8BE]">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold text-[#8B7CFF] hover:underline underline-offset-2"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Brand Tagline */}
        <p className="text-center text-xs text-[#647087] mt-6 tracking-wide">
          Noviq AI • Think. Ask. Discover.
        </p>
      </div>
    </div>
  );
}

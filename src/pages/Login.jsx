import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal/10 border border-teal/30 mb-4">
            <span className="text-teal text-2xl font-black">✦</span>
          </div>
          <div className="text-teal font-bold tracking-widest text-xs uppercase mb-1">
            Ikirere Orbital Labs Africa
          </div>
          <h1 className="text-white text-3xl font-extrabold tracking-tight">IOLA</h1>
          <p className="text-gray-500 text-sm mt-1">Internal Operations Platform</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-navy-800 rounded-2xl p-8 border border-navy-700 space-y-5"
        >
          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-900/40 rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-navy border border-navy-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-teal transition-colors placeholder-gray-600"
              placeholder="you@ikirere.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-navy border border-navy-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-teal transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal hover:bg-teal-light text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">
          Accounts are created by Jason. Contact him if you need access.
        </p>
      </div>
    </div>
  );
}

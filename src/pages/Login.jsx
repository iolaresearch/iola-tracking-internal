import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail]   = useState("");
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) { setError(error.message); setLoading(false); }
    else { setSent(true); setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 340 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, margin: "0 auto 16px",
            background: "var(--a-dim)", border: "1px solid var(--a-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.03em" }}>IOL</span>
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(14,205,183,0.65)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
            Ikirere Orbital Labs Africa
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--t)", lineHeight: 1 }}>IOLA</h1>
          <p style={{ color: "var(--tm)", fontSize: 12, marginTop: 5, fontWeight: 500 }}>Internal Operations Platform</p>
        </div>

        {sent ? (
          <div style={{ background: "var(--s1)", border: "1px solid var(--b)", borderRadius: 10, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>✉️</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--t)", marginBottom: 8 }}>Check your email</div>
            <p style={{ fontSize: 12, color: "var(--tm)", lineHeight: 1.65 }}>
              We sent a login link to <span style={{ color: "var(--accent)", fontWeight: 600 }}>{email}</span>.<br/>
              Click it to sign in — no password needed.
            </p>
            <button onClick={() => { setSent(false); setEmail(""); }} style={{
              marginTop: 16, fontSize: 11, color: "var(--tff)", background: "none",
              border: "none", cursor: "pointer", fontFamily: "var(--font)",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--tm)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--tff)"}>
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} style={{ background: "var(--s1)", border: "1px solid var(--b)", borderRadius: 10, padding: 24 }}>
            {error && (
              <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 7, padding: "10px 13px", marginBottom: 16, fontSize: 12, color: "#F87171" }}>
                {error}
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--tf)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required autoFocus autoComplete="email"
                className="iola-input" placeholder="you@ikirere.com"
              />
            </div>
            <button type="submit" disabled={loading} className="iola-btn iola-btn-primary" style={{ width: "100%", justifyContent: "center", padding: "9px 14px" }}>
              {loading ? "Sending link…" : "Send login link"}
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: "var(--tff)", marginTop: 20 }}>
          Accounts are created by Jason.
        </p>
      </div>
    </div>
  );
}

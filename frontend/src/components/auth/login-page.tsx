"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import styles from "./login.module.css";

type Step = "email" | "otp";

export function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [step,    setStep]    = useState<Step>("email");
  const [email,   setEmail]   = useState("");
  const [name,    setName]    = useState("");
  const [otp,     setOtp]     = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [isNew,   setIsNew]   = useState(false); // true when account is being created

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Step 1: request OTP ───────────────────────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json() as { message?: string; error?: { message: string } };
      if (!res.ok) throw new Error(data.error?.message ?? "Failed to send OTP");
      setStep("otp");
      // Focus first OTP box
      setTimeout(() => otpRefs.current[0]?.focus(), 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP input handling ────────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  // ── Step 2: verify OTP ────────────────────────────────────────────────────
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { setError("Enter all 6 digits"); return; }
    setError("");
    setLoading(true);
    try {
      const body: Record<string, string> = { email, otp: code };
      if (name.trim()) body.name = name.trim();

      const res = await fetch("/api/auth/verify-otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json() as {
        access_token?: string; refresh_token?: string; expires_in?: number;
        user?: { user_id: string; name: string; email: string; role: "user" | "admin" };
        is_new_user?: boolean;
        error?: { message: string };
      };
      if (!res.ok) {
        // Wrong OTP — shake boxes
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => otpRefs.current[0]?.focus(), 50);
        throw new Error(data.error?.message ?? "Verification failed");
      }
      login(data.access_token!, data.refresh_token!, data.expires_in!, data.user!);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          book<span>my</span>show
        </div>

        {step === "email" ? (
          <>
            <h1 className={styles.title}>Sign in or create account</h1>
            <p className={styles.subtitle}>We'll send a one-time password to your email.</p>

            <form onSubmit={handleEmailSubmit} noValidate className={styles.form}>
              <label className={styles.label}>
                Email address
                <input
                  className={styles.input}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </label>

              {error && <p className={styles.error} role="alert">{error}</p>}

              <button type="submit" className={styles.btn} disabled={loading || !email.trim()}>
                {loading ? "Sending OTP…" : "Continue with Email"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className={styles.title}>Enter OTP</h1>
            <p className={styles.subtitle}>
              We sent a 6-digit code to <strong>{email}</strong>.
              <button type="button" className={styles.changeEmail} onClick={() => { setStep("email"); setOtp(["","","","","",""]); setError(""); }}>
                Change
              </button>
            </p>

            <form onSubmit={handleOtpSubmit} noValidate className={styles.form}>
              {/* Name field — only shown if likely a new user (can't know for sure until verify) */}
              {isNew && (
                <label className={styles.label}>
                  Your name
                  <input
                    className={styles.input}
                    type="text"
                    autoComplete="name"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
              )}

              {/* OTP boxes */}
              <div className={styles.otpRow} onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    className={`${styles.otpBox} ${error ? styles.otpBoxError : ""}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    aria-label={`OTP digit ${i + 1}`}
                  />
                ))}
              </div>

              {error && <p className={styles.error} role="alert">{error}</p>}

              <button type="submit" className={styles.btn} disabled={loading || otp.join("").length < 6}>
                {loading ? "Verifying…" : "Verify OTP"}
              </button>

              {/* Resend */}
              <ResendButton email={email} onResent={() => { setOtp(["","","","","",""]); setError(""); }} />
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ── Resend with 30s cooldown ─────────────────────────────────────────────────

function ResendButton({ email, onResent }: { email: string; onResent: () => void }) {
  const [cooldown, setCooldown] = useState(0);
  const [sending,  setSending]  = useState(false);

  const handle = async () => {
    setSending(true);
    try {
      await fetch("/api/auth/request-otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      onResent();
      setCooldown(30);
      const iv = setInterval(() => {
        setCooldown((c) => { if (c <= 1) { clearInterval(iv); return 0; } return c - 1; });
      }, 1000);
    } finally { setSending(false); }
  };

  return (
    <button
      type="button"
      className={styles.resendBtn}
      onClick={handle}
      disabled={cooldown > 0 || sending}
    >
      {sending ? "Sending…" : cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
    </button>
  );
}

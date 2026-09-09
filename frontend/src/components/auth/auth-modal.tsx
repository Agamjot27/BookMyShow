"use client";

import { useEffect, useRef, useState } from "react";
import { X, Spinner } from "@phosphor-icons/react";
import { useAuth } from "@/components/auth-provider";
import styles from "./auth-modal.module.css";

type ModalStep = "email" | "otp" | "success";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ open, onClose, onSuccess }: AuthModalProps) {
  const { login } = useAuth();

  const [step, setStep] = useState<ModalStep>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setStep("email");
      setError("");
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => emailInputRef.current?.focus(), 100);
    }
  }, [open]);

  // Handle ESC key to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // ── Step 1: Request OTP ───────────────────────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json() as { message?: string; error?: { message: string } };
      if (!res.ok) throw new Error(data.error?.message ?? "Failed to send OTP");

      setStep("otp");
      startCooldown(30);
      setTimeout(() => otpRefs.current[0]?.focus(), 120);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Inputs ────────────────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
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

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload: Record<string, string> = { email: email.trim(), otp: code };
      if (name.trim()) payload.name = name.trim();

      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        user?: { user_id: string; name: string; email: string; role: "user" | "admin" };
        error?: { message: string };
      };

      if (!res.ok) {
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => otpRefs.current[0]?.focus(), 50);
        throw new Error(data.error?.message ?? "Invalid OTP. Please try again.");
      }

      // Persist session
      login(data.access_token!, data.refresh_token!, data.expires_in!, data.user!);

      // Show animated tick celebration!
      setStep("success");

      // Auto-close modal after animation completes
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Resend with cooldown ──────────────────────────────────────────────────
  const startCooldown = (sec: number) => {
    setCooldown(sec);
    const iv = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(iv);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setOtp(["", "", "", "", "", ""]);
      startCooldown(30);
      setTimeout(() => otpRefs.current[0]?.focus(), 80);
    } catch {
      setError("Could not resend OTP. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        {/* ── Top Gradient Banner ── */}
        <div className={styles.banner}>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={16} weight="bold" />
          </button>

          <div className={styles.brandRow}>
            {/* Vintage Movie Projector / Camera Icon */}
            <svg
              className={styles.cameraIcon}
              width="36"
              height="30"
              viewBox="0 0 40 34"
              fill="currentColor"
              aria-hidden="true"
            >
              <circle cx="11" cy="6" r="5" />
              <circle cx="23" cy="6" r="5" />
              <circle cx="11" cy="6" r="2" fill="#181b26" />
              <circle cx="23" cy="6" r="2" fill="#181b26" />
              <rect x="2" y="11" width="28" height="21" rx="4" />
              <path d="M30 16 L38 11.5 L38 26.5 L30 22 Z" />
            </svg>

            {/* BookMyShow Logo */}
            <div className={styles.brandLogo}>
              book<span>my</span>show
            </div>
          </div>

          <p className={styles.tagline}>Where movies meet magic.</p>
        </div>

        {/* ── Modal Body Content ── */}
        <div className={styles.body}>
          {step === "email" ? (
            <>
              <h2 id="auth-modal-title" className={styles.title}>
                Enter your email
              </h2>
              <p className={styles.subtitle}>
                If you don&apos;t have an account, we&apos;ll create one for you.
              </p>

              <form onSubmit={handleEmailSubmit} noValidate className={styles.form}>
                <div className={styles.inputGroup}>
                  <input
                    ref={emailInputRef}
                    className={styles.input}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {error && <p className={styles.errorMessage} role="alert">{error}</p>}

                <button
                  type="submit"
                  className={styles.continueBtn}
                  disabled={loading || !email.trim()}
                >
                  {loading ? <Spinner size={18} className="animate-spin" /> : "Continue"}
                </button>

                <p className={styles.termsText}>
                  By entering your email id, you&apos;re agreeing to our{" "}
                  <a href="#terms" onClick={(e) => e.preventDefault()}>Terms of Service</a> and{" "}
                  <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>. Thanks!
                </p>
              </form>
            </>
          ) : step === "otp" ? (
            <>
              <h2 id="auth-modal-title" className={styles.title}>
                Enter OTP
              </h2>
              <p className={styles.subtitle}>
                We sent a 6-digit code to <span className={styles.emailHighlight}>{email}</span>
                <button
                  type="button"
                  className={styles.editEmailBtn}
                  onClick={() => {
                    setStep("email");
                    setOtp(["", "", "", "", "", ""]);
                    setError("");
                  }}
                >
                  Edit
                </button>
              </p>

              <form onSubmit={handleOtpSubmit} noValidate className={styles.form}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>
                    <span>Your Name</span>
                    <span className={styles.optionalTag}>(optional for new accounts)</span>
                  </label>
                  <input
                    className={styles.input}
                    type="text"
                    autoComplete="name"
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className={styles.inputGroup}>
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
                        aria-label={`Digit ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {error && <p className={styles.errorMessage} role="alert">{error}</p>}

                <button
                  type="submit"
                  className={styles.continueBtn}
                  disabled={loading || otp.join("").length < 6}
                >
                  {loading ? <Spinner size={18} className="animate-spin" /> : "Verify & Continue"}
                </button>

                <div className={styles.resendRow}>
                  <button
                    type="button"
                    className={styles.resendBtn}
                    onClick={handleResend}
                    disabled={cooldown > 0 || resending}
                  >
                    {resending ? "Sending…" : cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* ── Step 3: Success Animation (Tick) ── */
            <div className={styles.successContainer}>
              <div className={styles.checkmarkWrapper}>
                <svg
                  className={styles.checkmark}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 52 52"
                >
                  <circle
                    className={styles.checkmarkCircle}
                    cx="26"
                    cy="26"
                    r="24"
                    fill="none"
                  />
                  <path
                    className={styles.checkmarkCheck}
                    fill="none"
                    d="M14.1 27.2l7.1 7.2 16.7-16.8"
                  />
                </svg>
              </div>
              <h2 className={styles.successTitle}>Signed in!</h2>
              <p className={styles.successDesc}>Welcome back to BookMyShow.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

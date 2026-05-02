"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/actions/auth";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await forgotPassword(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result?.success) {
      setSent(true);
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-mobile-logo">
            <span className="auth-logo-text font-display italic">Spot</span>
          </div>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-[var(--success)]" />
          </div>
          <h1 className="auth-title font-display">Correo enviado</h1>
          <p className="auth-subtitle">
            Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.
            Revisa tu bandeja de entrada y carpeta de spam.
          </p>
        </div>
        <Link href="/login" className="auth-button-primary text-center no-underline">
          <ArrowLeft size={16} />
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-card-header">
        <div className="auth-mobile-logo">
          <span className="auth-logo-text font-display italic">Spot</span>
        </div>
        <h1 className="auth-title font-display">¿Olvidaste tu contraseña?</h1>
        <p className="auth-subtitle">
          Ingresa tu correo y te enviaremos un enlace para restablecerla.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label htmlFor="forgot-email" className="auth-label">
            Correo electrónico
          </label>
          <div className="auth-input-wrapper">
            <Mail className="auth-input-icon" />
            <input
              id="forgot-email"
              name="email"
              type="email"
              placeholder="nombre@ejemplo.com"
              required
              autoComplete="email"
              autoFocus
              className="auth-input"
            />
          </div>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button
          type="submit"
          className="auth-button-primary"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            "Enviar enlace de recuperación"
          )}
        </button>

        <p className="auth-footer-link">
          <Link href="/login" className="auth-link flex items-center gap-1 justify-center">
            <ArrowLeft size={14} />
            Volver al inicio de sesión
          </Link>
        </p>
      </form>
    </div>
  );
}

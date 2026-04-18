"use client";

import { useState } from "react";
import Link from "next/link";
import { register } from "@/lib/actions/auth";
import { Loader2, Mail, Lock, Eye, EyeOff, User } from "lucide-react";

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    // Client-side: check passwords match
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    const result = await register(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      {/* Header */}
      <div className="auth-card-header">
        <div className="auth-mobile-logo">
          <span className="auth-logo-text">Spot</span>
        </div>
        <h1 className="auth-title">Crea tu cuenta</h1>
        <p className="auth-subtitle">Empieza a gestionar tu negocio hoy</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="auth-form">
        {/* Display Name */}
        <div className="auth-field">
          <label htmlFor="register-name" className="auth-label">
            Nombre completo
          </label>
          <div className="auth-input-wrapper">
            <User className="auth-input-icon" />
            <input
              id="register-name"
              name="display_name"
              type="text"
              placeholder="Tu nombre"
              required
              autoComplete="name"
              autoFocus
              className="auth-input"
            />
          </div>
        </div>

        {/* Email */}
        <div className="auth-field">
          <label htmlFor="register-email" className="auth-label">
            Correo electrónico
          </label>
          <div className="auth-input-wrapper">
            <Mail className="auth-input-icon" />
            <input
              id="register-email"
              name="email"
              type="email"
              placeholder="nombre@ejemplo.com"
              required
              autoComplete="email"
              className="auth-input"
            />
          </div>
        </div>

        {/* Password */}
        <div className="auth-field">
          <label htmlFor="register-password" className="auth-label">
            Contraseña
          </label>
          <div className="auth-input-wrapper">
            <Lock className="auth-input-icon" />
            <input
              id="register-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 6 caracteres"
              required
              autoComplete="new-password"
              minLength={6}
              className="auth-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="auth-input-toggle"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="auth-field">
          <label htmlFor="register-confirm" className="auth-label">
            Confirmar contraseña
          </label>
          <div className="auth-input-wrapper">
            <Lock className="auth-input-icon" />
            <input
              id="register-confirm"
              name="confirm_password"
              type={showPassword ? "text" : "password"}
              placeholder="Repite tu contraseña"
              required
              autoComplete="new-password"
              minLength={6}
              className="auth-input"
            />
          </div>
        </div>

        {/* Error */}
        {error && <div className="auth-error">{error}</div>}

        {/* Submit */}
        <button
          type="submit"
          className="auth-button-primary"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              Crear cuenta
              <span className="auth-button-arrow">→</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="auth-divider">
          <span>o continúa con</span>
        </div>

        {/* Social buttons */}
        <div className="auth-social-row" style={{ gridTemplateColumns: "1fr" }}>
          <button type="button" className="auth-button-social" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
        </div>

        {/* Login link */}
        <p className="auth-footer-link">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="auth-link">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  );
}

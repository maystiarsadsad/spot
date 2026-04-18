"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

const themes = [
  { value: "light", icon: Sun, label: "Claro" },
  { value: "dark", icon: Moon, label: "Oscuro" },
  { value: "system", icon: Monitor, label: "Sistema" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="theme-toggle-skeleton" />;
  }

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Tema">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          className={`theme-toggle-btn ${theme === value ? "active" : ""}`}
          onClick={() => setTheme(value)}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}

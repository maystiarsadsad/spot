"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

const themes = [
  { value: "light", icon: Sun, label: "Claro" },
  { value: "system", icon: Monitor, label: "Auto" },
  { value: "dark", icon: Moon, label: "Oscuro" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="theme-toggle-track"><div className="theme-toggle-skeleton" /></div>;
  }

  return (
    <div className="theme-toggle-track" role="radiogroup" aria-label="Tema">
      {themes.map(({ value, icon: Icon, label }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            title={label}
            className={`theme-toggle-option ${isActive ? "active" : ""}`}
            onClick={() => setTheme(value)}
          >
            <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { Check } from "lucide-react";
import {
  groupRule,
  isRequired,
  isSingle,
  toggleChoice,
  type OptionGroup,
  type OptionSelection,
} from "@/lib/item-options";

interface OptionPickerProps {
  groups: OptionGroup[];
  value: OptionSelection;
  onChange: (value: OptionSelection) => void;
  formatPrice: (n: number) => string;
  /** Highlight required groups that are still empty (after a failed submit) */
  showMissing?: boolean;
}

/** Rappi-style option groups: radios for single choice, checkboxes with a cap for multiple. */
export function OptionPicker({ groups, value, onChange, formatPrice, showMissing }: OptionPickerProps) {
  return (
    <div className="opt-picker">
      {groups.map((g) => {
        const chosen = value[g.id] ?? [];
        const missing = showMissing && chosen.length < g.min;
        const full = !isSingle(g) && chosen.length >= g.max;
        return (
          <fieldset key={g.id} className={`opt-group ${missing ? "is-missing" : ""}`}>
            <legend className="opt-group-head">
              <span className="opt-group-name">{g.name}</span>
              <span className={`opt-group-rule ${isRequired(g) ? "is-required" : ""}`}>
                {groupRule(g)}
                {!isSingle(g) && ` · ${chosen.length}/${g.max}`}
              </span>
            </legend>
            {g.choices.map((c) => {
              const selected = chosen.includes(c.id);
              const disabled = !c.available || (!selected && full);
              return (
                <label
                  key={c.id}
                  className={`opt-choice ${selected ? "is-selected" : ""} ${disabled ? "is-disabled" : ""}`}
                >
                  <input
                    type={isSingle(g) ? "radio" : "checkbox"}
                    name={`opt-${g.id}`}
                    checked={selected}
                    disabled={disabled}
                    onChange={() => onChange(toggleChoice(value, g, c.id))}
                    onClick={(e) => {
                      // let optional radios be cleared by tapping the selected one
                      if (isSingle(g) && selected && !isRequired(g)) {
                        e.preventDefault();
                        onChange(toggleChoice(value, g, c.id));
                      }
                    }}
                  />
                  <span className={`opt-mark ${isSingle(g) ? "is-radio" : ""}`} aria-hidden="true">
                    {selected && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className="opt-choice-name">
                    {c.name}
                    {!c.available && <em> · Agotado</em>}
                  </span>
                  {c.price > 0 && <span className="opt-choice-price">+{formatPrice(c.price)}</span>}
                </label>
              );
            })}
          </fieldset>
        );
      })}
    </div>
  );
}

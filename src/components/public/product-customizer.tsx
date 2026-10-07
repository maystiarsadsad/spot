"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { OptionPicker } from "@/components/shared/option-picker";
import {
  MAX_NOTE_LENGTH,
  defaultSelection,
  optionsPrice,
  snapshotSelection,
  validateSelection,
  type OptionGroup,
  type OptionSelection,
} from "@/lib/item-options";

interface ProductCustomizerProps {
  basePrice: number;
  groups: OptionGroup[];
  formatPrice: (n: number) => string;
  /** Options already chosen (e.g. the assistant suggested "Sin cebolla") */
  initialSelection?: OptionSelection | null;
  onAdd: (selection: OptionSelection, note: string, quantity: number) => void;
}

/** Option groups + special instructions + quantity, inside the product modal. */
export function ProductCustomizer({ basePrice, groups, formatPrice, initialSelection, onAdd }: ProductCustomizerProps) {
  const [selection, setSelection] = useState<OptionSelection>(() => ({ ...defaultSelection(groups), ...(initialSelection ?? {}) }));
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showMissing, setShowMissing] = useState(false);

  const unit = basePrice + optionsPrice(snapshotSelection(groups, selection));
  const problem = validateSelection(groups, selection);

  const submit = () => {
    if (problem) {
      setShowMissing(true);
      document.querySelector(".opt-group.is-missing")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    onAdd(selection, note, quantity);
  };

  return (
    <div className="store-customizer">
      <OptionPicker
        groups={groups}
        value={selection}
        onChange={setSelection}
        formatPrice={formatPrice}
        showMissing={showMissing}
      />

      <div>
        <label className="opt-note-label" htmlFor="opt-note">
          Instrucciones especiales <span>(opcional)</span>
        </label>
        <textarea
          id="opt-note"
          className="opt-note"
          maxLength={MAX_NOTE_LENGTH}
          placeholder="Ej: la salsa aparte, bien caliente…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="store-customizer-footer">
        <div className="store-qty-control store-qty-control-lg">
          <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Quitar uno">
            <Minus size={18} />
          </button>
          <span>{quantity}</span>
          <button type="button" onClick={() => setQuantity((q) => Math.min(99, q + 1))} aria-label="Agregar uno">
            <Plus size={18} />
          </button>
        </div>
        <button type="button" className="store-add-btn-lg" onClick={submit} aria-disabled={!!problem}>
          <ShoppingCart size={18} />
          Agregar · {formatPrice(unit * quantity)}
        </button>
      </div>
      {showMissing && problem && <p className="store-customizer-error">{problem}</p>}
    </div>
  );
}

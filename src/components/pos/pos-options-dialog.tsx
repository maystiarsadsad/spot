"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OptionPicker } from "@/components/shared/option-picker";
import { formatCurrency } from "@/lib/utils";
import {
  MAX_NOTE_LENGTH,
  defaultSelection,
  optionsPrice,
  snapshotSelection,
  validateSelection,
  type OptionGroup,
  type OptionSelection,
} from "@/lib/item-options";

interface Props {
  item: { id: string; name: string; price: number } | null;
  groups: OptionGroup[];
  currency: string;
  onClose: () => void;
  onConfirm: (selection: OptionSelection, note: string, quantity: number) => void;
}

/** POS: pick options for a customizable product before adding it to the ticket. */
export function PosOptionsDialog({ item, groups, currency, onClose, onConfirm }: Props) {
  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        {item && (
          // keyed so state resets for each product
          <PosOptionsForm key={item.id} item={item} groups={groups} currency={currency} onConfirm={onConfirm} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PosOptionsForm({ item, groups, currency, onConfirm, onClose }: Omit<Props, "item"> & { item: NonNullable<Props["item"]> }) {
  const [selection, setSelection] = useState<OptionSelection>(() => defaultSelection(groups));
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showMissing, setShowMissing] = useState(false);
  const fmt = (n: number) => formatCurrency(n, currency);

  const unit = item.price + optionsPrice(snapshotSelection(groups, selection));
  const problem = validateSelection(groups, selection);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{item.name}</DialogTitle>
        <DialogDescription>Base {fmt(item.price)} · elige las opciones del cliente</DialogDescription>
      </DialogHeader>

      <OptionPicker groups={groups} value={selection} onChange={setSelection} formatPrice={fmt} showMissing={showMissing} />

      <div className="space-y-2">
        <Label htmlFor="pos-note">Nota para cocina</Label>
        <Textarea
          id="pos-note"
          rows={2}
          maxLength={MAX_NOTE_LENGTH}
          placeholder="Ej: sin sal, para llevar…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {showMissing && problem && <p className="text-sm text-destructive">{problem}</p>}

      <DialogFooter className="flex-row items-center gap-2 sm:justify-between">
        <div className="flex items-center gap-2 border rounded-md p-0.5">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Quitar uno">
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-6 text-center font-medium">{quantity}</span>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQuantity((q) => Math.min(99, q + 1))} aria-label="Agregar uno">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            type="button"
            onClick={() => {
              if (problem) return setShowMissing(true);
              onConfirm(selection, note, quantity);
            }}
          >
            Agregar · {fmt(unit * quantity)}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, Package, Plus, Star, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  OPTION_PRESETS,
  newOptionId,
  parseOptionGroups,
  type OptionChoice,
  type OptionGroup,
} from "@/lib/item-options";

interface InventoryItem {
  id: string;
  name: string;
  unit: string | null;
}

interface Props {
  value: OptionGroup[];
  onChange: (groups: OptionGroup[]) => void;
  inventoryItems?: InventoryItem[];
  /** Other catalog items, to copy their option groups */
  otherItems?: { id: string; name: string; options: unknown }[];
}

const emptyChoice = (): OptionChoice => ({ id: newOptionId(), name: "", price: 0, available: true });

export function OptionGroupsEditor({ value, onChange, inventoryItems = [], otherItems = [] }: Props) {
  const copySources = otherItems.filter((it) => parseOptionGroups(it.options).length > 0);

  const setGroup = (gi: number, patch: Partial<OptionGroup>) =>
    onChange(value.map((g, i) => (i === gi ? normalize({ ...g, ...patch }) : g)));

  const setChoice = (gi: number, ci: number, patch: Partial<OptionChoice>) =>
    setGroup(gi, { choices: value[gi].choices.map((c, i) => (i === ci ? { ...c, ...patch } : c)) });

  const moveGroup = (gi: number, dir: -1 | 1) => {
    const next = [...value];
    [next[gi], next[gi + dir]] = [next[gi + dir], next[gi]];
    onChange(next);
  };

  const copyFrom = (itemId: string) => {
    const src = otherItems.find((it) => it.id === itemId);
    if (!src) return;
    const cloned = parseOptionGroups(src.options).map((g) => ({
      ...g,
      id: newOptionId(),
      choices: g.choices.map((c) => ({ ...c, id: newOptionId() })),
    }));
    onChange([...value, ...cloned]);
  };

  return (
    <div className="opt-editor">
      <div>
        <Label>Opciones para el cliente</Label>
        <p className="opt-editor-mini mt-1">
          Proteína, término, adiciones, cubiertos, quitar ingredientes… El cliente las elige al pedir y el precio se suma solo.
        </p>
      </div>

      {value.map((g, gi) => (
        <div key={g.id} className="opt-editor-group">
          <div className="opt-editor-row">
            <input
              className="opt-input grow"
              value={g.name}
              placeholder="Nombre del grupo (ej. Elige tu proteína)"
              onChange={(e) => setGroup(gi, { name: e.target.value })}
              aria-label="Nombre del grupo"
            />
            <button type="button" className="opt-editor-icon" onClick={() => moveGroup(gi, -1)} disabled={gi === 0} aria-label="Subir grupo">
              <ArrowUp size={14} />
            </button>
            <button type="button" className="opt-editor-icon" onClick={() => moveGroup(gi, 1)} disabled={gi === value.length - 1} aria-label="Bajar grupo">
              <ArrowDown size={14} />
            </button>
            <button type="button" className="opt-editor-icon" onClick={() => onChange(value.filter((_, i) => i !== gi))} aria-label="Eliminar grupo">
              <Trash2 size={14} />
            </button>
          </div>

          <div className="opt-editor-row opt-editor-mini">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={g.min > 0} onChange={(e) => setGroup(gi, { min: e.target.checked ? 1 : 0 })} />
              Obligatorio
            </label>
            <span className="ml-2">El cliente puede elegir hasta</span>
            <input
              className="opt-input"
              style={{ width: 64 }}
              type="number"
              min={1}
              max={Math.max(1, g.choices.length)}
              value={g.max}
              onChange={(e) => setGroup(gi, { max: Number(e.target.value) || 1 })}
              aria-label="Máximo de opciones"
            />
            <span>{g.max === 1 ? "opción" : "opciones"}</span>
          </div>

          {g.choices.map((c, ci) => (
            <div key={c.id} className="flex flex-col gap-1.5">
              <div className="opt-editor-choice">
                <input
                  className="opt-input"
                  value={c.name}
                  placeholder="Opción (ej. Res)"
                  onChange={(e) => setChoice(gi, ci, { name: e.target.value })}
                  aria-label="Nombre de la opción"
                />
                <input
                  className="opt-input"
                  type="number"
                  min={0}
                  step={100}
                  value={c.price || ""}
                  placeholder="+ $0"
                  onChange={(e) => setChoice(gi, ci, { price: Math.max(0, Number(e.target.value) || 0) })}
                  aria-label="Precio adicional"
                />
                <button
                  type="button"
                  className={`opt-editor-icon opt-editor-default ${c.default ? "is-on" : ""}`}
                  onClick={() => setChoice(gi, ci, { default: !c.default || undefined })}
                  title="Seleccionada por defecto"
                  aria-pressed={!!c.default}
                >
                  <Star size={14} />
                </button>
                <button
                  type="button"
                  className={`opt-editor-icon ${c.available ? "" : "is-on"}`}
                  onClick={() => setChoice(gi, ci, { available: !c.available })}
                  title={c.available ? "Disponible (clic para marcar agotada)" : "Agotada"}
                  aria-pressed={!c.available}
                >
                  {c.available ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <div className="flex gap-1.5">
                  {inventoryItems.length > 0 && (
                    <button
                      type="button"
                      className={`opt-editor-icon ${c.inventory_id ? "is-on" : ""}`}
                      onClick={() =>
                        setChoice(gi, ci, c.inventory_id
                          ? { inventory_id: null, inventory_qty: null }
                          : { inventory_id: inventoryItems[0].id, inventory_qty: 1 })
                      }
                      title="Descontar un insumo del inventario al venderla"
                      aria-pressed={!!c.inventory_id}
                    >
                      <Package size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="opt-editor-icon"
                    onClick={() => setGroup(gi, { choices: g.choices.filter((_, i) => i !== ci) })}
                    aria-label="Eliminar opción"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {c.inventory_id && (
                <div className="opt-editor-sub">
                  <select
                    className="opt-input"
                    value={c.inventory_id}
                    onChange={(e) => setChoice(gi, ci, { inventory_id: e.target.value })}
                    aria-label="Insumo a descontar"
                  >
                    {inventoryItems.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        Descuenta: {inv.name} {inv.unit ? `(${inv.unit})` : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    className="opt-input"
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={c.inventory_qty ?? ""}
                    onChange={(e) => setChoice(gi, ci, { inventory_qty: Number(e.target.value) || null })}
                    aria-label="Cantidad a descontar"
                  />
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            className="opt-editor-chip self-start"
            onClick={() => setGroup(gi, { choices: [...g.choices, emptyChoice()] })}
          >
            <Plus size={12} className="inline -mt-0.5" /> Agregar opción
          </button>
        </div>
      ))}

      <div className="flex flex-col gap-2">
        <span className="opt-editor-mini">Agregar grupo:</span>
        <div className="opt-editor-presets">
          {OPTION_PRESETS.map((p) => (
            <button key={p.key} type="button" className="opt-editor-chip" onClick={() => onChange([...value, p.build()])}>
              + {p.label}
            </button>
          ))}
          <button
            type="button"
            className="opt-editor-chip"
            onClick={() => onChange([...value, { id: newOptionId(), name: "", min: 0, max: 1, choices: [emptyChoice()] }])}
          >
            + Grupo en blanco
          </button>
        </div>
        {copySources.length > 0 && (
          <select
            className="opt-input"
            value=""
            onChange={(e) => e.target.value && copyFrom(e.target.value)}
            aria-label="Copiar opciones de otro producto"
          >
            <option value="">Copiar opciones de otro producto…</option>
            {copySources.map((it) => (
              <option key={it.id} value={it.id}>{it.name}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

/** Keeps max within the number of choices and min ≤ max while editing. */
function normalize(g: OptionGroup): OptionGroup {
  const max = Math.min(Math.max(1, Math.floor(g.max) || 1), Math.max(1, g.choices.length));
  return { ...g, max, min: Math.min(g.min, max) };
}

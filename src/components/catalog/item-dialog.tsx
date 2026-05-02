"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { createItem, updateItem, getItemIngredients, upsertIngredient, removeIngredient } from "@/lib/actions/catalog";
import { uploadCatalogImage } from "@/lib/actions/catalog-images";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Loader2, ImagePlus, X, Package, ChefHat, Unlink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cost: number | null;
  compare_price: number | null;
  sku: string | null;
  category_id: string | null;
  inventory_id?: string | null;
  type: string | null;
  active: boolean | null;
  image_url: string | null;
}

interface InventoryItem {
  id: string;
  name: string;
  unit: string | null;
}

interface Ingredient {
  inventory_id: string;
  quantity: number;
  unit?: string;
  // For display
  inventoryName?: string;
  inventoryUnit?: string | null;
}

type InventoryMode = "none" | "direct" | "recipe";

interface Props {
  businessId: string;
  businessType: string;
  categories: Category[];
  inventoryItems?: InventoryItem[];
  item?: CatalogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CatalogItemDialog({
  businessId,
  businessType,
  categories,
  inventoryItems = [],
  item,
  open,
  onOpenChange,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [imagePreview, setImagePreview] = useState<string | null>(item?.image_url || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!item;

  // Inventory state
  const [invMode, setInvMode] = useState<InventoryMode>("none");
  const [directInvId, setDirectInvId] = useState<string>("none");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);

  // Load ingredients when editing
  useEffect(() => {
    if (open && isEditing && item) {
      // Determine initial mode
      if (item.inventory_id) {
        setInvMode("direct");
        setDirectInvId(item.inventory_id);
        setIngredients([]);
      } else {
        // Check for ingredients
        setLoadingIngredients(true);
        getItemIngredients(item.id).then((ings) => {
          if (ings && ings.length > 0) {
            setInvMode("recipe");
            setDirectInvId("none");
            setIngredients(
              ings.map((ing: any) => ({
                inventory_id: ing.inventory_id,
                quantity: ing.quantity,
                unit: ing.unit || undefined,
                inventoryName: ing.inventory?.name,
                inventoryUnit: ing.inventory?.unit,
              }))
            );
          } else {
            setInvMode("none");
            setDirectInvId("none");
            setIngredients([]);
          }
          setLoadingIngredients(false);
        });
      }
    } else if (open && !isEditing) {
      setInvMode("none");
      setDirectInvId("none");
      setIngredients([]);
    }
  }, [open, isEditing, item]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Set inventory_id based on mode
    if (invMode === "direct" && directInvId !== "none") {
      formData.set("inventory_id", directInvId);
    } else {
      formData.set("inventory_id", "none");
    }

    startTransition(async () => {
      const result = isEditing
        ? await updateItem(item!.id, formData)
        : await createItem(businessId, formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      const itemId = isEditing ? item!.id : (result as any).itemId;

      // Upload image if one was selected
      if (imageFile && itemId) {
        const imgFormData = new FormData();
        imgFormData.append("image", imageFile);
        const imgResult = await uploadCatalogImage(businessId, itemId, imgFormData);
        if (imgResult.error) {
          toast.error(imgResult.error);
        }
      }

      // Save ingredients if recipe mode
      if (invMode === "recipe" && itemId) {
        // First remove all existing ingredients (clean slate)
        if (isEditing) {
          const existing = await getItemIngredients(item!.id);
          for (const ex of existing || []) {
            await removeIngredient(item!.id, ex.inventory_id);
          }
        }
        // Then add current ingredients
        for (const ing of ingredients) {
          if (ing.inventory_id && ing.quantity > 0) {
            await upsertIngredient({
              catalog_item_id: itemId,
              inventory_id: ing.inventory_id,
              quantity: ing.quantity,
              unit: ing.unit,
            });
          }
        }
      } else if (invMode !== "recipe" && isEditing) {
        // Clear ingredients if switching away from recipe mode
        const existing = await getItemIngredients(item!.id);
        for (const ex of existing || []) {
          await removeIngredient(item!.id, ex.inventory_id);
        }
      }

      toast.success(isEditing ? "Producto actualizado" : "Producto creado");
      onOpenChange(false);
    });
  }

  /* ── Ingredient helpers ─────────────────── */

  function addIngredient() {
    // Find first inventory item not already in the list
    const usedIds = new Set(ingredients.map((i) => i.inventory_id));
    const available = inventoryItems.find((inv) => !usedIds.has(inv.id));
    if (!available) {
      toast.error("Ya has agregado todos los productos del inventario");
      return;
    }
    setIngredients([
      ...ingredients,
      {
        inventory_id: available.id,
        quantity: 1,
        inventoryName: available.name,
        inventoryUnit: available.unit,
      },
    ]);
  }

  function removeIngredientLocal(idx: number) {
    setIngredients(ingredients.filter((_, i) => i !== idx));
  }

  function updateIngredientField(idx: number, field: keyof Ingredient, value: any) {
    setIngredients(
      ingredients.map((ing, i) => {
        if (i !== idx) return ing;
        if (field === "inventory_id") {
          const inv = inventoryItems.find((it) => it.id === value);
          return { ...ing, inventory_id: value, inventoryName: inv?.name, inventoryUnit: inv?.unit };
        }
        return { ...ing, [field]: value };
      })
    );
  }

  /* ── UI helpers ─────────────────────────── */

  const getPlaceholders = () => {
    switch (businessType) {
      case "restaurant": return { name: "Ej: Hamburguesa clásica", sku: "HAM-001" };
      case "hotel": return { name: "Ej: Habitación Doble Superior", sku: "HAB-201" };
      case "retail": return { name: "Ej: Camiseta Básica Blanca", sku: "CAM-001" };
      case "services": return { name: "Ej: Corte de cabello", sku: "SER-001" };
      case "agency": return { name: "Ej: Creación de página web", sku: "WEB-001" };
      default: return { name: "Ej: Producto o Servicio", sku: "ABC-001" };
    }
  };
  const pl = getPlaceholders();

  const getTypes = () => {
    switch (businessType) {
      case "restaurant": case "cafe": case "bar":
        return [{ value: "product", label: "Platillo / Bebida" }];
      case "hotel": case "hostel":
        return [{ value: "room", label: "Habitación" }, { value: "service", label: "Servicio / Extra" }];
      case "retail": case "boutique": case "grocery": case "pharmacy":
        return [{ value: "product", label: "Producto" }];
      case "services": case "agency": case "consulting":
        return [{ value: "service", label: "Servicio" }];
      case "gym": case "spa":
        return [{ value: "membership", label: "Membresía" }, { value: "service", label: "Servicio" }, { value: "product", label: "Producto" }];
      default:
        return [
          { value: "product", label: "Producto" },
          { value: "service", label: "Servicio" },
          { value: "room", label: "Habitación" },
          { value: "membership", label: "Membresía" },
        ];
    }
  };
  const types = getTypes();

  const [categoryId, setCategoryId] = useState(item?.category_id || "none");
  const [typeId, setTypeId] = useState(item?.type || types[0].value);

  const usedIngredientIds = new Set(ingredients.map((i) => i.inventory_id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los datos del producto."
              : "Completa los datos para agregar un producto al catálogo."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="item-name">Nombre *</Label>
            <Input
              id="item-name"
              name="name"
              placeholder={pl.name}
              defaultValue={item?.name || ""}
              required
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Imagen del producto</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageChange}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-[var(--line)] group">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setImageFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-28 rounded-xl border-2 border-dashed border-[var(--line)] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              >
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs font-medium">Subir imagen (máx 5MB)</span>
              </button>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="item-desc">Descripción</Label>
            <Textarea
              id="item-desc"
              name="description"
              placeholder="Descripción opcional del producto"
              defaultValue={item?.description || ""}
              rows={2}
            />
          </div>

          {/* Price + Cost row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="item-price">Precio *</Label>
              <Input id="item-price" name="price" type="number" min="0" step="0.01" placeholder="0.00" defaultValue={item?.price ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-cost">Costo</Label>
              <Input id="item-cost" name="cost" type="number" min="0" step="0.01" placeholder="0.00" defaultValue={item?.cost ?? ""} />
            </div>
          </div>

          {/* Compare price + SKU */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="item-compare">Precio anterior</Label>
              <Input id="item-compare" name="compare_price" type="number" min="0" step="0.01" placeholder="Ej: 15000" defaultValue={item?.compare_price ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-sku">SKU</Label>
              <Input id="item-sku" name="sku" placeholder={pl.sku} defaultValue={item?.sku || ""} />
            </div>
          </div>

          {/* Category + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select name="category_id" value={categoryId} onValueChange={(val) => setCategoryId(val || "none")}>
                <SelectTrigger>
                  <span className="flex flex-1 text-left truncate">
                    {categoryId === "none" ? "Sin categoría" : categories.find((c) => c.id === categoryId)?.name || "Sin categoría"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select name="type" value={typeId} onValueChange={(val) => setTypeId(val || typeId)}>
                <SelectTrigger>
                  <span className="flex flex-1 text-left truncate">
                    {types.find((t) => t.value === typeId)?.label || "Producto"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {types.map((typeOption) => (
                    <SelectItem key={typeOption.value} value={typeOption.value}>{typeOption.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isEditing && (
            <input type="hidden" name="active" value={String(item?.active ?? true)} />
          )}

          {/* ═══ Inventory Section ═══ */}
          {inventoryItems.length > 0 && (
            <div className="inv-link-section">
              <Label className="inv-link-title">Control de inventario</Label>
              <p className="inv-link-desc">
                Define cómo este producto afecta tu stock al venderse.
              </p>

              {/* Mode selector */}
              <div className="inv-link-modes">
                <button
                  type="button"
                  className={`inv-link-mode ${invMode === "none" ? "active" : ""}`}
                  onClick={() => { setInvMode("none"); setDirectInvId("none"); }}
                >
                  <Unlink size={16} />
                  <div>
                    <span className="inv-link-mode-label">Sin inventario</span>
                    <span className="inv-link-mode-hint">No afecta el stock</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={`inv-link-mode ${invMode === "direct" ? "active" : ""}`}
                  onClick={() => setInvMode("direct")}
                >
                  <Package size={16} />
                  <div>
                    <span className="inv-link-mode-label">Producto directo</span>
                    <span className="inv-link-mode-hint">1 venta = 1 unidad de stock</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={`inv-link-mode ${invMode === "recipe" ? "active" : ""}`}
                  onClick={() => setInvMode("recipe")}
                >
                  <ChefHat size={16} />
                  <div>
                    <span className="inv-link-mode-label">Receta / Compuesto</span>
                    <span className="inv-link-mode-hint">Consume varios insumos</span>
                  </div>
                </button>
              </div>

              {/* Direct mode */}
              {invMode === "direct" && (
                <div className="inv-link-direct">
                  <Select
                    value={directInvId}
                    onValueChange={(val) => setDirectInvId(val || "none")}
                  >
                    <SelectTrigger>
                      <span className="flex flex-1 text-left truncate">
                        {directInvId === "none"
                          ? "Seleccionar producto del inventario"
                          : inventoryItems.find((i) => i.id === directInvId)?.name || "Seleccionar"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Seleccionar producto del inventario</SelectItem>
                      {inventoryItems.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          📦 {inv.name} {inv.unit ? `(${inv.unit})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="inv-link-hint">
                    Cada unidad vendida descuenta 1 del producto seleccionado.
                  </p>
                </div>
              )}

              {/* Recipe mode */}
              {invMode === "recipe" && (
                <div className="inv-link-recipe">
                  {loadingIngredients ? (
                    <div className="inv-link-loading">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando ingredientes...
                    </div>
                  ) : (
                    <>
                      {ingredients.length === 0 && (
                        <p className="inv-link-empty">
                          Aún no hay ingredientes. Agrega los insumos que se consumen al vender este producto.
                        </p>
                      )}

                      {ingredients.map((ing, idx) => (
                        <div key={idx} className="inv-link-ingredient">
                          <select
                            className="inv-ing-select"
                            value={ing.inventory_id}
                            onChange={(e) => updateIngredientField(idx, "inventory_id", e.target.value)}
                          >
                            {inventoryItems.map((inv) => (
                              <option
                                key={inv.id}
                                value={inv.id}
                                disabled={usedIngredientIds.has(inv.id) && inv.id !== ing.inventory_id}
                              >
                                {inv.name} {inv.unit ? `(${inv.unit})` : ""}
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            className="inv-ing-qty"
                            min="0.01"
                            step="0.01"
                            value={ing.quantity}
                            onChange={(e) => updateIngredientField(idx, "quantity", parseFloat(e.target.value) || 0)}
                            placeholder="Cant."
                          />

                          <span className="inv-ing-unit">{ing.inventoryUnit || ""}</span>

                          <button
                            type="button"
                            className="inv-ing-remove"
                            onClick={() => removeIngredientLocal(idx)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="inv-ing-add"
                        onClick={addIngredient}
                        disabled={ingredients.length >= inventoryItems.length}
                      >
                        <Plus size={14} /> Agregar insumo
                      </button>
                    </>
                  )}
                  <p className="inv-link-hint">
                    Al vender 1 unidad de este producto se descontará la cantidad indicada de cada insumo.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Guardar cambios" : "Crear producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

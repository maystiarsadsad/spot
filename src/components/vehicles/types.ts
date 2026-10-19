import type { MarkdownAction } from "@/lib/dealership/pricing";
import type { VehicleDocuments } from "@/lib/dealership/documents";

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  moto: "Moto",
  carro: "Carro",
  camioneta: "Camioneta",
  otro: "Otro",
};

export const STATUS_LABELS: Record<string, string> = {
  in_stock: "En venta",
  reserved: "Reservado",
  sold: "Vendido",
  withdrawn: "Retirado",
};

export const COST_CATEGORY_LABELS: Record<string, string> = {
  repair: "Reparación",
  paperwork: "Trámites",
  cleaning: "Alistamiento",
  transport: "Transporte",
  other: "Otro",
};

export interface CostRow {
  id: string;
  concept: string;
  category: string;
  amount: number;
  spentOn: string;
}

export interface PriceChangeRow {
  id: string;
  oldPrice: number | null;
  newPrice: number;
  reason: string | null;
  createdAt: string;
}

export interface VehicleRow {
  id: string;
  type: string;
  plate: string;
  brand: string;
  model: string | null;
  year: number | null;
  color: string | null;
  mileageKm: number | null;
  displacementCc: number | null;
  vin: string | null;
  engineNumber: string | null;
  status: string;
  published: boolean;
  acquiredOn: string;
  days: number;
  purchasePrice: number;
  sellerName: string | null;
  purchaseNotes: string | null;
  costs: CostRow[];
  /** Purchase + reconditioning. */
  cost: number;
  listPrice: number | null;
  minPrice: number | null;
  margin: number | null;
  advice: { action: MarkdownAction; steps: number; suggestedPrice: number | null; floor: number };
  docLocation: string | null;
  documents: VehicleDocuments;
  docProblems: number;
  description: string | null;
  photos: string[];
  priceChanges: PriceChangeRow[];
  soldOn: string | null;
  soldPrice: number | null;
  buyerName: string | null;
}

export const vehicleTitle = (v: Pick<VehicleRow, "brand" | "model" | "year">) =>
  [v.brand, v.model, v.year].filter(Boolean).join(" ");

export const selectClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

"use client";

import { useTransition } from "react";
import { Bike, Copy, ExternalLink, Loader2, MapPinned, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { enableDeliveryTracking } from "@/lib/actions/deliveries";

export interface DeliveryInfo {
  status: string;
  tracking_token: string;
  courier_token: string;
  courier_name: string | null;
  location_updated_at: string | null;
}

const deliveryStatusLabel: Record<string, string> = {
  pending: "Esperando repartidor",
  on_the_way: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

interface DeliveryPanelProps {
  transactionId: string;
  orderCode: string | null;
  orderStatus: string | null;
  customerName: string | null;
  customerPhone: string | null;
  businessSlug: string;
  delivery: DeliveryInfo | null;
  whatsappUrl: (phone: string, msg?: string) => string;
}

export function DeliveryPanel({
  transactionId,
  orderCode,
  orderStatus,
  customerName,
  customerPhone,
  businessSlug,
  delivery,
  whatsappUrl,
}: DeliveryPanelProps) {
  const [isPending, startTransition] = useTransition();
  const closed = orderStatus === "completed" || orderStatus === "cancelled";

  if (!delivery) {
    if (closed) return null;
    return (
      <div className="orders-delivery" onClick={(e) => e.stopPropagation()}>
        <h4><MapPinned size={15} /> Seguimiento en mapa</h4>
        <button
          className="orders-action-btn progress"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const res = await enableDeliveryTracking(transactionId);
              if (res.error) toast.error(res.error);
              else toast.success("Seguimiento activado");
            })
          }
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <MapPinned size={16} />}
          Activar seguimiento
        </button>
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const trackingUrl = `${origin}/${businessSlug}/pedido/${delivery.tracking_token}`;
  const courierUrl = `${origin}/${businessSlug}/repartidor/${delivery.courier_token}`;

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const courierMsg = `Nuevo domicilio${orderCode ? ` ${orderCode}` : ""}. Abre este link para ver la dirección e iniciar la entrega: ${courierUrl}`;
  const customerMsg = `Hola ${customerName || ""}, sigue tu pedido${orderCode ? ` ${orderCode}` : ""} en tiempo real aquí: ${trackingUrl}`;

  return (
    <div className="orders-delivery" onClick={(e) => e.stopPropagation()}>
      <h4>
        <Bike size={15} /> Domicilio
        <span className={`orders-delivery-status status-${delivery.status}`}>
          {deliveryStatusLabel[delivery.status] ?? delivery.status}
          {delivery.status === "on_the_way" && delivery.courier_name ? ` · ${delivery.courier_name}` : ""}
        </span>
      </h4>

      {!closed && delivery.status !== "delivered" && (
        <div className="orders-delivery-row">
          <span className="orders-info-label">Repartidor</span>
          <div className="orders-delivery-actions">
            <a
              className="orders-whatsapp-btn"
              href={`https://wa.me/?text=${encodeURIComponent(courierMsg)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Send size={14} /> Enviar link
            </a>
            <button className="orders-delivery-icon-btn" onClick={() => copy(courierUrl, "Link del repartidor")} title="Copiar link">
              <Copy size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="orders-delivery-row">
        <span className="orders-info-label">Cliente</span>
        <div className="orders-delivery-actions">
          {customerPhone && (
            <a
              className="orders-whatsapp-btn"
              href={whatsappUrl(customerPhone, customerMsg)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={14} /> Enviar seguimiento
            </a>
          )}
          <button className="orders-delivery-icon-btn" onClick={() => copy(trackingUrl, "Link de seguimiento")} title="Copiar link">
            <Copy size={14} />
          </button>
          <a className="orders-delivery-icon-btn" href={trackingUrl} target="_blank" rel="noopener noreferrer" title="Ver mapa">
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}

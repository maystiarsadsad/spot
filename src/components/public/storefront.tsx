"use client";

import { useState, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Search,
  ShoppingBag,
  Star,
  Plus,
  Minus,
  Trash2,
  X,
  MessageCircle,
  Send,
  ShoppingCart,
  Bot,
  Truck,
  Store,
  CheckCircle,
  ArrowLeft,
  Loader2,
  Bike,
} from "lucide-react";
import type { Database } from "@/types/database";
import { publicChatMessage } from "@/lib/actions/public-chat";
import type { AssistantAction } from "@/lib/assistant/keyword-engine";
import { createPublicOrder } from "@/lib/actions/orders";
import { LocationPicker } from "@/components/maps/location-picker";
import { ProductCustomizer } from "@/components/public/product-customizer";
import {
  describeOptions,
  lineKey,
  optionsPrice,
  parseOptionGroups,
  snapshotSelection,
  type OptionGroup,
  type OptionSelection,
  type SelectedOption,
} from "@/lib/item-options";
import type { LatLng } from "@/components/maps/leaflet";

type Business = Database["public"]["Tables"]["businesses"]["Row"];
type Category = Database["public"]["Tables"]["catalog_categories"]["Row"];
type CatalogItem = Database["public"]["Tables"]["catalog_items"]["Row"];

/** Last delivery order placed from this device, so the customer can always get back to tracking. */
type ActiveOrder = { token: string; code: string; at: number };
const ACTIVE_ORDER_TTL_MS = 12 * 60 * 60 * 1000;
const activeOrderKey = (businessId: string) => `spot:active-order:${businessId}`;

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // storage unavailable — the success screen still shows the link
  }
}

function parseActiveOrder(raw: string | null): ActiveOrder | null {
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as ActiveOrder;
    return Date.now() - saved.at < ACTIVE_ORDER_TTL_MS ? saved : null;
  } catch {
    return null;
  }
}

interface CartItem {
  /** Same product + same options + same note → same line */
  key: string;
  item: CatalogItem;
  quantity: number;
  selection: OptionSelection;
  options: SelectedOption[];
  note: string;
  /** Base price + chosen options */
  unitPrice: number;
}

interface PublicStorefrontProps {
  business: Business;
  categories: Category[];
  items: CatalogItem[];
  /** Appointment businesses: replaces the product grid + cart with the booking flow */
  booking?: React.ReactNode;
}

export function PublicStorefront({
  business,
  categories,
  items,
  booking,
}: PublicStorefrontProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const aiGreeting = business.ai_agent_greeting || `¡Hola! 👋 Soy el asistente de ${business.name}. Pregúntame por precios, opciones de los productos, horarios o domicilios.`;
  const [presetSelection, setPresetSelection] = useState<OptionSelection | null>(null);
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; text: string; action?: AssistantAction }[]
  >([
    {
      role: "assistant",
      text: aiGreeting,
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  // ── Checkout state (separate from chat) ──
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'success'>('form');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkoutDelivery, setCheckoutDelivery] = useState<'pickup' | 'delivery'>('pickup');
  const [checkoutAddress, setCheckoutAddress] = useState("");
  const [checkoutOrderCode, setCheckoutOrderCode] = useState("");
  const [checkoutLocation, setCheckoutLocation] = useState<LatLng | null>(null);
  const [checkoutTrackingToken, setCheckoutTrackingToken] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<ActiveOrder | null>(null);
  const storedOrderRaw = useSyncExternalStore(
    subscribeStorage,
    () => readStorage(activeOrderKey(business.id)),
    () => null
  );
  const storedOrder = useMemo(() => parseActiveOrder(storedOrderRaw), [storedOrderRaw]);
  const activeOrder = placedOrder ?? storedOrder;

  const currency = business.currency || "COP";

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(price);

  // Option groups per product (proteína, adiciones, cubiertos…)
  const groupsById = useMemo(() => {
    const map = new Map<string, OptionGroup[]>();
    for (const it of items) map.set(it.id, parseOptionGroups(it.options));
    return map;
  }, [items]);
  const isCustomizable = (item: CatalogItem) => (groupsById.get(item.id)?.length ?? 0) > 0;

  // Cart logic
  const addLine = (item: CatalogItem, selection: OptionSelection = {}, note = "", quantity = 1) => {
    const options = snapshotSelection(groupsById.get(item.id) ?? [], selection);
    const key = lineKey(item.id, selection, note);
    setCart((prev) => {
      if (prev.some((c) => c.key === key)) {
        return prev.map((c) => (c.key === key ? { ...c, quantity: c.quantity + quantity } : c));
      }
      return [...prev, { key, item, quantity, selection, options, note: note.trim(), unitPrice: item.price + optionsPrice(options) }];
    });
  };

  /** Products with options open the customizer instead of adding straight away. */
  const addToCart = (item: CatalogItem) => {
    if (isCustomizable(item)) {
      setSelectedItem(item);
      return;
    }
    addLine(item);
  };

  const updateQuantity = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.key === key ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (key: string) => {
    setCart((prev) => prev.filter((c) => c.key !== key));
  };

  const cartTotal = useMemo(
    () => cart.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0),
    [cart]
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, c) => sum + c.quantity, 0),
    [cart]
  );

  const getItemQty = (itemId: string) =>
    cart.filter((c) => c.item.id === itemId).reduce((sum, c) => sum + c.quantity, 0);

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesCategory =
      !activeCategory || item.category_id === activeCategory;
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categoriesWithItems = activeCategory
    ? categories.filter((c) => c.id === activeCategory)
    : categories;

  const uncategorizedItems = filteredItems.filter(
    (item) =>
      !item.category_id ||
      !categories.find((c) => c.id === item.category_id)
  );

  // ── Checkout handler ──
  const handleCheckout = async () => {
    if (!checkoutName.trim() || !checkoutPhone.trim()) return;
    if (checkoutDelivery === 'delivery' && !checkoutAddress.trim()) return;
    setCheckoutLoading(true);

    const result = await createPublicOrder(business.id, {
      customer_name: checkoutName.trim(),
      customer_phone: checkoutPhone.trim(),
      delivery_type: checkoutDelivery,
      address: checkoutDelivery === 'delivery' ? checkoutAddress.trim() : undefined,
      location: checkoutDelivery === 'delivery' && checkoutLocation ? checkoutLocation : undefined,
      items: cart.map((c) => ({
        catalog_item_id: c.item.id,
        quantity: c.quantity,
        options: c.selection,
        notes: c.note || undefined,
      })),
    });

    setCheckoutLoading(false);

    if (result.success && result.transaction) {
      setCheckoutOrderCode(result.transaction.code || '');
      setCheckoutTrackingToken(result.trackingToken ?? null);
      if (result.trackingToken) {
        const saved: ActiveOrder = { token: result.trackingToken, code: result.transaction.code || '', at: Date.now() };
        setPlacedOrder(saved);
        try {
          localStorage.setItem(activeOrderKey(business.id), JSON.stringify(saved));
        } catch {
          // ignore
        }
      }
      setCheckoutStep('success');
      setCart([]);
    } else {
      alert(result.error || 'Error al crear el pedido');
    }
  };

  // Cart summary sent to the assistant so it can answer "¿cuánto llevo?"
  const cartSummary = cart.length > 0
    ? `${cart.map((c) => `${c.item.name}${c.options.length ? ` (${describeOptions(c.options).join('; ')})` : ''} x${c.quantity} = ${formatPrice(c.unitPrice * c.quantity)}`).join('; ')}. Total: ${formatPrice(cartTotal)}`
    : null;

  // Chat handler — the server picks the engine (Claude or the automatic assistant)
  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    const history = chatMessages.slice(1).map((m) => ({ role: m.role, text: m.text }));
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatLoading(true);
    try {
      const result = await publicChatMessage(business.id, userMsg, history, cartSummary);
      setChatMessages((prev) => [...prev, { role: "assistant", text: result.response, action: result.action }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", text: "No pude responder en este momento. Intenta de nuevo en un momento 🙏" }]);
    }
    setChatLoading(false);
  };

  /** "Personalizar X" button from the assistant: opens the product with the suggested option. */
  const handleChatAction = (action: AssistantAction) => {
    const item = items.find((it) => it.id === action.itemId);
    if (!item) return;
    if (isCustomizable(item)) {
      setPresetSelection(action.selection ?? null);
      setSelectedItem(item);
      setChatOpen(false);
    } else {
      addLine(item);
      setChatMessages((prev) => [...prev, { role: "assistant", text: `¡Listo! Agregué ${item.name} a tu carrito 🛒` }]);
    }
  };

  const closeItem = () => {
    setSelectedItem(null);
    setPresetSelection(null);
  };

  // ── Theme: apply business-level design customization ──
  const themeData = (business.theme as Record<string, any>) || {};
  const FONT_MAP: Record<string, string> = {
    inter: "'Inter', system-ui, sans-serif",
    roboto: "'Roboto', system-ui, sans-serif",
    poppins: "'Poppins', system-ui, sans-serif",
    playfair: "'Playfair Display', serif",
    outfit: "'Outfit', system-ui, sans-serif",
    system: "system-ui, -apple-system, sans-serif",
  };

  const storeThemeStyle: React.CSSProperties & Record<string, string> = {};
  // primary_color is the explicit Mi Página override; brandColor (Configuración)
  // is what the settings screen promises will also apply to the web page.
  const storePrimary = themeData.primary_color || themeData.brandColor;
  if (storePrimary) {
    storeThemeStyle["--store-primary"] = storePrimary;
  }
  if (themeData.bg_color) {
    storeThemeStyle["--store-bg"] = themeData.bg_color;
    storeThemeStyle["--store-surface"] = `color-mix(in srgb, ${themeData.bg_color} 92%, white)`;
    storeThemeStyle["--store-card-bg"] = `color-mix(in srgb, ${themeData.bg_color} 85%, white)`;
  }
  if (themeData.text_color) {
    storeThemeStyle["--store-text"] = themeData.text_color;
    storeThemeStyle["--store-muted"] = `color-mix(in srgb, ${themeData.text_color} 55%, transparent)`;
    storeThemeStyle["--store-border"] = `color-mix(in srgb, ${themeData.text_color} 15%, transparent)`;
  }
  if (themeData.font_family && FONT_MAP[themeData.font_family]) {
    storeThemeStyle.fontFamily = FONT_MAP[themeData.font_family];
  }
  if (themeData.border_radius) {
    storeThemeStyle["--store-radius"] = `${themeData.border_radius}px`;
  }

  return (
    <div className="public-store" style={storeThemeStyle}>
      {/* Hero Header */}
      <header className="store-hero">
        {business.cover_url && (
          <div
            className="store-hero-bg"
            style={{ backgroundImage: `url(${business.cover_url})` }}
          />
        )}
        <div className="store-hero-overlay" />

        <div className="store-hero-content">
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.name}
              className="store-logo"
            />
          ) : (
            <div className="store-logo-placeholder">
              <ShoppingBag size={32} />
            </div>
          )}

          <div className="store-hero-text">
            <h1 className="store-name">{business.name}</h1>
            {business.tagline && (
              <p className="store-tagline">{business.tagline}</p>
            )}
            {business.description && (
              <p className="store-description">{business.description}</p>
            )}
          </div>

          {/* Contact Pills */}
          <div className="store-contact-row">
            {business.phone && (
              <a href={`tel:${business.phone}`} className="store-pill">
                <Phone size={14} />
                Llamar
              </a>
            )}
            {business.email && (
              <a href={`mailto:${business.email}`} className="store-pill">
                <Mail size={14} />
                Email
              </a>
            )}
            {business.address && (
              <span className="store-pill">
                <MapPin size={14} />
                {business.address}
              </span>
            )}
          </div>
        </div>
      </header>

      {booking ? (
        <main className="store-main">{booking}</main>
      ) : (
      <>
      {/* Sticky Nav */}
      <nav className="store-nav">
        <div className="store-nav-inner">
          <div className="store-search">
            <Search size={16} className="store-search-icon" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="store-search-input"
            />
          </div>

          {categories.length > 1 && (
            <div className="store-categories">
              <button
                onClick={() => setActiveCategory(null)}
                className={`store-cat-btn ${!activeCategory ? "active" : ""}`}
              >
                Todo
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`store-cat-btn ${activeCategory === cat.id ? "active" : ""}`}
                >
                  {cat.icon && <span>{cat.icon}</span>}
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Products */}
      <main className="store-main">
        {categoriesWithItems.map((category) => {
          const catItems = filteredItems.filter(
            (item) => item.category_id === category.id
          );
          if (catItems.length === 0) return null;

          return (
            <section key={category.id} className="store-section">
              <h2 className="store-section-title">
                {category.icon && <span>{category.icon}</span>}
                {category.name}
                <span className="store-section-count">{catItems.length}</span>
              </h2>
              <div className="store-grid">
                {catItems.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    formatPrice={formatPrice}
                    quantity={getItemQty(item.id)}
                    customizable={isCustomizable(item)}
                    onAdd={() => addToCart(item)}
                    onDetail={() => setSelectedItem(item)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {uncategorizedItems.length > 0 && (
          <section className="store-section">
            <h2 className="store-section-title">Otros productos</h2>
            <div className="store-grid">
              {uncategorizedItems.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  formatPrice={formatPrice}
                  quantity={getItemQty(item.id)}
                  customizable={isCustomizable(item)}
                  onAdd={() => addToCart(item)}
                  onDetail={() => setSelectedItem(item)}
                />
              ))}
            </div>
          </section>
        )}

        {filteredItems.length === 0 && (
          <div className="store-empty">
            <ShoppingBag size={48} strokeWidth={1} />
            <p>No se encontraron productos</p>
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setActiveCategory(null);
                }}
                className="store-empty-btn"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </main>
      </>
      )}

      {/* Product Detail Modal */}
      {selectedItem && (
        <div
          className="store-modal-overlay"
          onClick={closeItem}
        >
          <div className="store-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="store-modal-close"
              onClick={closeItem}
            >
              <X size={16} />
            </button>

            {selectedItem.image_url && (
              <div className="store-modal-image">
                <img src={selectedItem.image_url} alt={selectedItem.name} />
              </div>
            )}

            <div className="store-modal-body">
              <h2 className="store-modal-title">{selectedItem.name}</h2>
              {selectedItem.description && (
                <p className="store-modal-desc">{selectedItem.description}</p>
              )}

              <div className="store-modal-pricing">
                <span className="store-modal-price">
                  {formatPrice(selectedItem.price)}
                </span>
                {selectedItem.compare_price &&
                  selectedItem.compare_price > selectedItem.price && (
                    <span className="store-modal-compare">
                      {formatPrice(selectedItem.compare_price)}
                    </span>
                  )}
              </div>

              {/* Add to cart controls */}
              {isCustomizable(selectedItem) ? (
                <ProductCustomizer
                  key={`${selectedItem.id}-${JSON.stringify(presetSelection)}`}
                  basePrice={selectedItem.price}
                  groups={groupsById.get(selectedItem.id) ?? []}
                  formatPrice={formatPrice}
                  initialSelection={presetSelection}
                  onAdd={(selection, note, quantity) => {
                    addLine(selectedItem, selection, note, quantity);
                    closeItem();
                  }}
                />
              ) : (
              <div className="store-modal-actions">
                {getItemQty(selectedItem.id) > 0 ? (
                  <div className="store-qty-control store-qty-control-lg">
                    <button onClick={() => updateQuantity(selectedItem.id, -1)}>
                      <Minus size={18} />
                    </button>
                    <span>{getItemQty(selectedItem.id)}</span>
                    <button onClick={() => addLine(selectedItem)}>
                      <Plus size={18} />
                    </button>
                  </div>
                ) : (
                  <button
                    className="store-add-btn-lg"
                    onClick={() => {
                      addToCart(selectedItem);
                    }}
                  >
                    <ShoppingCart size={18} />
                    Agregar al carrito
                  </button>
                )}
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Active delivery shortcut ═══ */}
      {activeOrder && !checkoutOpen && (
        <Link href={`/${business.slug}/pedido/${activeOrder.token}`} className="store-track-pill">
          <Bike size={16} />
          Ver mi pedido{activeOrder.code ? ` ${activeOrder.code}` : ''}
        </Link>
      )}

      {/* ═══ Cart Drawer ═══ */}
      {cartOpen && (
        <div className="store-drawer-overlay" onClick={() => setCartOpen(false)}>
          <div className="store-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="store-drawer-header">
              <h2>
                <ShoppingCart size={20} />
                Tu pedido
              </h2>
              <button onClick={() => setCartOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="store-drawer-empty">
                <ShoppingBag size={48} strokeWidth={1} />
                <p>Tu carrito está vacío</p>
                <span>Agrega productos desde el catálogo</span>
              </div>
            ) : (
              <>
                <div className="store-drawer-items">
                  {cart.map((cartItem) => (
                    <div key={cartItem.key} className="store-drawer-item">
                      {cartItem.item.image_url && (
                        <img
                          src={cartItem.item.image_url}
                          alt={cartItem.item.name}
                          className="store-drawer-item-img"
                        />
                      )}
                      <div className="store-drawer-item-info">
                        <p className="store-drawer-item-name">
                          {cartItem.item.name}
                        </p>
                        {(cartItem.options.length > 0 || cartItem.note) && (
                          <ul className="opt-lines">
                            {describeOptions(cartItem.options, formatPrice).map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                            {cartItem.note && <li className="opt-line-note">“{cartItem.note}”</li>}
                          </ul>
                        )}
                        <p className="store-drawer-item-price">
                          {formatPrice(cartItem.unitPrice * cartItem.quantity)}
                        </p>
                      </div>
                      <div className="store-drawer-item-controls">
                        <div className="store-qty-control">
                          <button
                            onClick={() =>
                              updateQuantity(cartItem.key, -1)
                            }
                          >
                            <Minus size={14} />
                          </button>
                          <span>{cartItem.quantity}</span>
                          <button onClick={() => updateQuantity(cartItem.key, 1)}>
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          className="store-drawer-remove"
                          onClick={() => removeFromCart(cartItem.key)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="store-drawer-footer">
                  <div className="store-drawer-total">
                    <span>Total</span>
                    <span>{formatPrice(cartTotal)}</span>
                  </div>
                  <button
                    className="store-checkout-btn"
                    onClick={() => {
                      setCartOpen(false);
                      setCheckoutStep('form');
                      setCheckoutOpen(true);
                    }}
                  >
                    Confirmar pedido
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ Checkout Modal ═══ */}
      {checkoutOpen && (
        <div className="store-modal-overlay" onClick={() => setCheckoutOpen(false)}>
          <div className="store-checkout-modal" onClick={(e) => e.stopPropagation()}>
            <button className="store-modal-close" onClick={() => setCheckoutOpen(false)}>
              <X size={16} />
            </button>

            {checkoutStep === 'form' ? (
              <>
                <div className="store-checkout-header">
                  <ShoppingBag size={24} />
                  <div>
                    <h2>Confirmar pedido</h2>
                    <p>{cartCount} producto{cartCount > 1 ? 's' : ''} · {formatPrice(cartTotal)}</p>
                  </div>
                </div>

                <div className="store-checkout-form">
                  <div className="store-checkout-field">
                    <label>Nombre *</label>
                    <input
                      type="text"
                      placeholder="Tu nombre completo"
                      value={checkoutName}
                      onChange={(e) => setCheckoutName(e.target.value)}
                    />
                  </div>
                  <div className="store-checkout-field">
                    <label>Teléfono *</label>
                    <input
                      type="tel"
                      placeholder="Tu número de teléfono"
                      value={checkoutPhone}
                      onChange={(e) => setCheckoutPhone(e.target.value)}
                    />
                  </div>

                  <div className="store-checkout-field">
                    <label>Tipo de entrega</label>
                    <div className="store-checkout-delivery-options">
                      <button
                        className={`store-delivery-option ${checkoutDelivery === 'pickup' ? 'active' : ''}`}
                        onClick={() => setCheckoutDelivery('pickup')}
                      >
                        <Store size={20} />
                        <span>Recoger en tienda</span>
                      </button>
                      <button
                        className={`store-delivery-option ${checkoutDelivery === 'delivery' ? 'active' : ''}`}
                        onClick={() => setCheckoutDelivery('delivery')}
                      >
                        <Truck size={20} />
                        <span>Envío a domicilio</span>
                      </button>
                    </div>
                  </div>

                  {checkoutDelivery === 'delivery' && (
                    <div className="store-checkout-field">
                      <label>Dirección de entrega *</label>
                      <input
                        type="text"
                        placeholder="Tu dirección completa"
                        value={checkoutAddress}
                        onChange={(e) => setCheckoutAddress(e.target.value)}
                      />
                    </div>
                  )}

                  {checkoutDelivery === 'delivery' && (
                    <div className="store-checkout-field">
                      <label>Ubicación en el mapa</label>
                      <LocationPicker value={checkoutLocation} onChange={setCheckoutLocation} />
                    </div>
                  )}

                  <button
                    className="store-checkout-submit"
                    onClick={handleCheckout}
                    disabled={checkoutLoading || !checkoutName.trim() || !checkoutPhone.trim() || (checkoutDelivery === 'delivery' && !checkoutAddress.trim())}
                  >
                    {checkoutLoading ? (
                      <><Loader2 size={18} className="store-spin" /> Procesando...</>
                    ) : (
                      <><Send size={18} /> Enviar pedido</>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="store-checkout-success">
                <div className="store-checkout-success-icon">
                  <CheckCircle size={48} />
                </div>
                <h2>¡Pedido enviado!</h2>
                <p className="store-checkout-code">Código: <strong>{checkoutOrderCode}</strong></p>
                <p>Te contactaremos al <strong>{checkoutPhone}</strong> para confirmar tu pedido.</p>
                {checkoutTrackingToken && (
                  <Link
                    href={`/${business.slug}/pedido/${checkoutTrackingToken}`}
                    className="store-checkout-submit store-checkout-track"
                  >
                    <Bike size={18} /> Seguir mi pedido en el mapa
                  </Link>
                )}
                <button
                  className="store-checkout-submit"
                  onClick={() => {
                    setCheckoutOpen(false);
                    setCheckoutName('');
                    setCheckoutPhone('');
                    setCheckoutAddress('');
                    setCheckoutLocation(null);
                    setCheckoutTrackingToken(null);
                    setCheckoutDelivery('pickup');
                  }}
                >
                  Listo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Chat Widget ═══ */}
      {chatOpen && (
        <div className="store-chat">
          <div className="store-chat-header">
            <div className="store-chat-header-info">
              <Bot size={20} />
              <div>
                <p className="store-chat-header-name">Asistente</p>
                <span className="store-chat-header-status">En línea</span>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="store-chat-messages">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`store-chat-msg ${msg.role === "user" ? "user" : "assistant"}`}
              >
                <p style={{ whiteSpace: "pre-line" }}>{msg.text}</p>
                {msg.action && (
                  <button type="button" className="store-chat-action" onClick={() => handleChatAction(msg.action!)}>
                    {msg.action.label}
                  </button>
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="store-chat-msg assistant">
                <p style={{ opacity: 0.6 }}>Escribiendo...</p>
              </div>
            )}
          </div>

          <div className="store-chat-input-row">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              placeholder="Escribe un mensaje..."
              className="store-chat-input"
            />
            <button className="store-chat-send" onClick={handleSendChat}>
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ═══ Floating Action Buttons ═══ */}
      <div className="store-fab-group">
        {/* Chat FAB */}
        <button
          className="store-fab store-fab-chat"
          onClick={() => {
            setChatOpen(!chatOpen);
            if (cartOpen) setCartOpen(false);
          }}
        >
          {chatOpen ? <X size={22} /> : <MessageCircle size={22} />}
        </button>

        {/* Cart FAB */}
        {!booking && (
        <button
          className="store-fab store-fab-cart"
          onClick={() => {
            setCartOpen(!cartOpen);
            if (chatOpen) setChatOpen(false);
          }}
        >
          <ShoppingCart size={22} />
          {cartCount > 0 && (
            <span className="store-fab-badge">{cartCount}</span>
          )}
        </button>
        )}
      </div>

      {/* Footer */}
      <footer className="store-footer">
        <p>
          {business.name} © {new Date().getFullYear()}
        </p>
        <p className="store-footer-powered">
          Creado con{" "}
          <Link href="/" className="store-footer-link font-display italic">
            Spot
          </Link>
        </p>
      </footer>
    </div>
  );
}

/* ─── Product Card ─────────────────────────────────── */
function ProductCard({
  item,
  formatPrice,
  quantity,
  customizable,
  onAdd,
  onDetail,
}: {
  item: CatalogItem;
  formatPrice: (n: number) => string;
  quantity: number;
  customizable: boolean;
  onAdd: () => void;
  onDetail: () => void;
}) {
  const hasDiscount = item.compare_price && item.compare_price > item.price;

  return (
    <article className="store-card">
      <div onClick={onDetail}>
        {item.image_url ? (
          <div className="store-card-img">
            <img src={item.image_url} alt={item.name} loading="lazy" />
            {hasDiscount && <span className="store-card-badge">Oferta</span>}
            {item.featured && (
              <span className="store-card-badge star">
                <Star size={12} /> Destacado
              </span>
            )}
          </div>
        ) : (
          <div className="store-card-img store-card-img-empty">
            <ShoppingBag size={28} strokeWidth={1.2} />
          </div>
        )}

        <div className="store-card-body">
          <h3 className="store-card-name">{item.name}</h3>
          {item.description && (
            <p className="store-card-desc">{item.description}</p>
          )}
          {customizable && <span className="opt-badge">Personalizable</span>}
          <div className="store-card-pricing">
            <span className="store-card-price">{formatPrice(item.price)}</span>
            {hasDiscount && (
              <span className="store-card-compare">
                {formatPrice(item.compare_price!)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Add button */}
      <div className="store-card-action">
        {quantity > 0 && !customizable ? (
          <span className="store-card-qty-badge">{quantity} en carrito</span>
        ) : (
          <button
            className="store-card-add-btn"
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
          >
            <Plus size={16} />
            {customizable ? (quantity > 0 ? `Agregar otro (${quantity})` : "Elegir") : "Agregar"}
          </button>
        )}
      </div>
    </article>
  );
}

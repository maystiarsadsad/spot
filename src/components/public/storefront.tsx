"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import type { Database } from "@/types/database";
import { publicChatMessage } from "@/lib/actions/public-chat";

type Business = Database["public"]["Tables"]["businesses"]["Row"];
type Category = Database["public"]["Tables"]["catalog_categories"]["Row"];
type CatalogItem = Database["public"]["Tables"]["catalog_items"]["Row"];

interface CartItem {
  item: CatalogItem;
  quantity: number;
}

interface PublicStorefrontProps {
  business: Business;
  categories: Category[];
  items: CatalogItem[];
}

export function PublicStorefront({
  business,
  categories,
  items,
}: PublicStorefrontProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const aiEnabled = business.ai_agent_enabled || false;
  const aiGreeting = business.ai_agent_greeting || `¡Hola! 👋 Soy el asistente de ${business.name}. ¿En qué te puedo ayudar?`;
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([
    {
      role: "assistant",
      text: aiGreeting,
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  const currency = business.currency || "COP";

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(price);

  // Cart logic
  const addToCart = (item: CatalogItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.item.id === itemId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  };

  const cartTotal = useMemo(
    () => cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0),
    [cart]
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, c) => sum + c.quantity, 0),
    [cart]
  );

  const getItemQty = (itemId: string) =>
    cart.find((c) => c.item.id === itemId)?.quantity || 0;

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

  // Chat handler — uses Gemini AI when enabled, falls back to keyword logic
  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatLoading(true);

    // Try AI first
    if (aiEnabled) {
      try {
        const result = await publicChatMessage(business.id, userMsg);
        if (result.success && result.response) {
          setChatMessages((prev) => [...prev, { role: "assistant", text: result.response! }]);
          setChatLoading(false);
          return;
        }
      } catch {
        // Fall through to keyword logic
      }
    }

    // Fallback: keyword-based logic
    let response = "";
    const lower = userMsg.toLowerCase();

    if (lower.includes("menú") || lower.includes("menu") || lower.includes("productos") || lower.includes("catálogo")) {
      const catNames = categories.map((c) => c.name).join(", ");
      response = `Tenemos las siguientes categorías: ${catNames}. ¿Qué te gustaría pedir?`;
    } else if (lower.includes("precio") || lower.includes("cuánto") || lower.includes("cuanto") || lower.includes("cuesta")) {
      const matchedItem = items.find((item) => lower.includes(item.name.toLowerCase()));
      response = matchedItem
        ? `${matchedItem.name} tiene un precio de ${formatPrice(matchedItem.price)}. ¿Te lo agrego al carrito?`
        : `Puedes ver los precios en el catálogo arriba. ¿De qué producto necesitas el precio?`;
    } else if (lower.includes("pedir") || lower.includes("ordenar") || lower.includes("quiero")) {
      const matchedItem = items.find((item) => lower.includes(item.name.toLowerCase()));
      if (matchedItem) {
        addToCart(matchedItem);
        response = `¡Listo! Agregué "${matchedItem.name}" a tu carrito (${formatPrice(matchedItem.price)}). ¿Algo más?`;
      } else {
        response = `¡Claro! ¿Qué te gustaría pedir? Puedes decirme el nombre del producto o navegar el catálogo.`;
      }
    } else if (lower.includes("carrito") || lower.includes("pedido") || lower.includes("total")) {
      if (cart.length === 0) {
        response = `Tu carrito está vacío. Explora nuestro catálogo y agrega lo que te guste. 🛒`;
      } else {
        const summary = cart.map((c) => `• ${c.item.name} x${c.quantity} — ${formatPrice(c.item.price * c.quantity)}`).join("\n");
        response = `Tu pedido actual:\n${summary}\n\n💰 Total: ${formatPrice(cartTotal)}`;
      }
    } else if (lower.includes("hola") || lower.includes("hi") || lower.includes("buenas")) {
      response = `¡Hola! 👋 ¿En qué puedo ayudarte?`;
    } else {
      response = `¿Puedo ayudarte con algo?\n• 🛒 Hacer un pedido\n• 💰 Consultar precios\n• 📋 Ver el menú`;
    }

    setChatMessages((prev) => [...prev, { role: "assistant", text: response }]);
    setChatLoading(false);
  };

  return (
    <div className="public-store">
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

      {/* Product Detail Modal */}
      {selectedItem && (
        <div
          className="store-modal-overlay"
          onClick={() => setSelectedItem(null)}
        >
          <div className="store-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="store-modal-close"
              onClick={() => setSelectedItem(null)}
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
              <div className="store-modal-actions">
                {getItemQty(selectedItem.id) > 0 ? (
                  <div className="store-qty-control store-qty-control-lg">
                    <button onClick={() => updateQuantity(selectedItem.id, -1)}>
                      <Minus size={18} />
                    </button>
                    <span>{getItemQty(selectedItem.id)}</span>
                    <button onClick={() => addToCart(selectedItem)}>
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
            </div>
          </div>
        </div>
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
                    <div key={cartItem.item.id} className="store-drawer-item">
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
                        <p className="store-drawer-item-price">
                          {formatPrice(cartItem.item.price * cartItem.quantity)}
                        </p>
                      </div>
                      <div className="store-drawer-item-controls">
                        <div className="store-qty-control">
                          <button
                            onClick={() =>
                              updateQuantity(cartItem.item.id, -1)
                            }
                          >
                            <Minus size={14} />
                          </button>
                          <span>{cartItem.quantity}</span>
                          <button onClick={() => addToCart(cartItem.item)}>
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          className="store-drawer-remove"
                          onClick={() => removeFromCart(cartItem.item.id)}
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
                      setChatOpen(true);
                      setChatMessages((prev) => [
                        ...prev,
                        {
                          role: "assistant",
                          text: `¡Perfecto! Tienes ${cartCount} producto${cartCount > 1 ? "s" : ""} en tu carrito por un total de ${formatPrice(cartTotal)}.\n\nPara completar tu pedido necesito:\n• 📱 Tu nombre\n• 📞 Tu teléfono\n• 📍 ¿Recoges en tienda o envío a domicilio?\n\nDime tus datos y confirmo el pedido.`,
                        },
                      ]);
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
      </div>

      {/* Footer */}
      <footer className="store-footer">
        <p>
          {business.name} © {new Date().getFullYear()}
        </p>
        <p className="store-footer-powered">
          Creado con{" "}
          <Link href="/" className="store-footer-link">
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
  onAdd,
  onDetail,
}: {
  item: CatalogItem;
  formatPrice: (n: number) => string;
  quantity: number;
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
        {quantity > 0 ? (
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
            Agregar
          </button>
        )}
      </div>
    </article>
  );
}

/* global React, SpotIcons, SpotSpark */
const Iexp = SpotIcons;
const SparkExp = SpotSpark;

function ExpShell({ children, active = "dash", cardStyle = "elevated" }) {
  const navItems = [
    { k: "dash", label: "Panel", icon: Iexp.dash },
    { k: "res", label: "Reservas", icon: Iexp.cal },
    { k: "ord", label: "Pedidos", icon: Iexp.cart, badge: "12" },
    { k: "cat", label: "Catálogo", icon: Iexp.pkg },
    { k: "inv", label: "Inventario", icon: Iexp.warehouse },
    { k: "fin", label: "Finanzas", icon: Iexp.cash },
    { k: "team", label: "Equipo", icon: Iexp.team },
    { k: "cli", label: "Clientes", icon: Iexp.contacts },
    { k: "rep", label: "Reportes", icon: Iexp.reports },
    { k: "web", label: "Mi Página", icon: Iexp.globe },
  ];
  return (
    <div className="frame exp">
      <div className="shell-exp">
        <aside className="sidebar-exp">
          <div className="brand">
            <div className="brand-mark" />
            <div className="brand-name">spot.</div>
          </div>
          <button className="biz-card">
            <div className="biz-logo">SP</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="biz-name sb-text">Sandy Papas</div>
              <div className="biz-meta sb-text">Comida Rápida</div>
            </div>
            <span style={{ color: "var(--ink-3)" }}>{Iexp.chevUD}</span>
          </button>
          <div className="nav-label sb-text">Trabajo</div>
          {navItems.map((n) => (
            <a key={n.k} className={`nav-item ${active === n.k ? "active" : ""}`}>
              <span className="nav-icon">{n.icon}</span>
              <span className="sb-text">{n.label}</span>
              {n.badge && <span className="nav-badge sb-text">{n.badge}</span>}
            </a>
          ))}
          <div style={{ marginTop: "auto" }}>
            <a className="nav-item">
              <span className="nav-icon">{Iexp.cog}</span>
              <span className="sb-text">Configuración</span>
            </a>
            <div className="sidebar-foot">
              <div className="av-exp">JM</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sb-user-name sb-text" style={{ fontSize: 13, fontWeight: 700 }}>Juan Martínez</div>
                <div className="sb-user-email sb-text" style={{ fontSize: 11, color: "var(--ink-3)" }}>Admin</div>
              </div>
            </div>
          </div>
        </aside>
        {children(cardStyle)}
      </div>
    </div>
  );
}

function ExpDashboard({ cardStyle = "elevated" }) {
  return (
    <ExpShell active="dash" cardStyle={cardStyle}>
      {(cs) => (
        <main className="main-exp">
          <div className="topbar-exp">
            <div className="crumbs-exp">SPOT / <strong>Panel</strong></div>
            <div className="topbar-exp-spacer" />
            <button className="pill-btn">Hoy</button>
            <button className="pill-btn primary">{Iexp.plus} Nuevo pedido</button>
          </div>
          <div className="content-exp">
            <div className="hero">
              <h1>Buen día, <em>Juan</em>.<br />Hoy va <em>buenísimo</em>.</h1>
              <p>Llevas 47 pedidos y $1.842.500 en ventas. Vas 12% arriba de ayer a esta hora.</p>
              <div className="hero-tags">
                <span className="hero-tag">⚡ 5 en cola</span>
                <span className="hero-tag">🔥 Burger Clásica trending</span>
                <span className="hero-tag">⏱ Tiempo prom: 8 min</span>
              </div>
              <div className="hero-decor" />
            </div>

            <div className="stats-row">
              <div className={`stat stat-style-${cs} pop-orange`}>
                <div className="stat-lbl-exp"><span className="stat-icon-exp">{Iexp.cash}</span>Ventas</div>
                <div className="stat-val-exp">$1.84M</div>
                <div className="stat-delta-exp">{Iexp.arrowUp} 12.4% vs ayer</div>
              </div>
              <div className={`stat stat-style-${cs}`}>
                <div className="stat-lbl-exp"><span className="stat-icon-exp">{Iexp.cart}</span>Pedidos</div>
                <div className="stat-val-exp">47</div>
                <div className="stat-delta-exp">{Iexp.arrowUp} 8 más</div>
              </div>
              <div className={`stat stat-style-${cs} pop-mint`}>
                <div className="stat-lbl-exp"><span className="stat-icon-exp">{Iexp.reports}</span>Ticket prom.</div>
                <div className="stat-val-exp">$39.2K</div>
                <div className="stat-delta-exp">{Iexp.arrowDown} 2.1%</div>
              </div>
              <div className={`stat stat-style-${cs} pop-violet`}>
                <div className="stat-lbl-exp"><span className="stat-icon-exp">{Iexp.contacts}</span>Clientes nuevos</div>
                <div className="stat-val-exp">8</div>
                <div className="stat-delta-exp">{Iexp.arrowUp} 33%</div>
              </div>
            </div>

            <div className="panel-row">
              <div className={`panel-exp panel-exp-style-${cs}`}>
                <div className="panel-head-exp">
                  <div className="panel-title-exp">Pedidos <em>recientes</em></div>
                  <button className="pill-btn">Ver todos →</button>
                </div>
                <table className="tbl-exp">
                  <thead><tr><th>Orden</th><th>Cliente</th><th>Total</th><th>Estado</th></tr></thead>
                  <tbody>
                    {[
                      ["#1284","María González","$54.000","Completado","pos"],
                      ["#1283","Carlos Ruiz","$32.500","En proceso","info"],
                      ["#1282","Ana Pérez","$78.200","Pendiente","warn"],
                      ["#1281","Diego Torres","$21.800","Completado","pos"],
                      ["#1280","Lucía Mejía","$45.600","Pendiente","warn"],
                    ].map(([code,name,total,st,tone])=>(
                      <tr key={code}>
                        <td><span className="order-code">{code}</span></td>
                        <td>{name}</td>
                        <td><span className="order-amount">{total}</span></td>
                        <td><span className={`tag-exp ${tone}`}><span className="tag-dot" />{st}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={`panel-exp panel-exp-style-${cs}`}>
                <div className="panel-head-exp">
                  <div className="panel-title-exp">Top <em>productos</em></div>
                  <button className="pill-btn">Semana</button>
                </div>
                <div style={{ padding: 14 }}>
                  {[
                    ["🍔","Burger Clásica",24,"$432K","var(--exp-accent-2)"],
                    ["🍟","Papas grandes",18,"$216K","var(--exp-mint)"],
                    ["🥤","Limonada",15,"$112K","var(--exp-rose)"],
                    ["🌮","Tacos x3",12,"$180K","#cdd9ff"],
                    ["🍕","Pizza personal",9,"$153K","var(--exp-accent-2)"],
                  ].map(([emo,name,qty,rev,bg])=>(
                    <div key={name} style={{ display: "grid", gridTemplateColumns: "40px 1fr auto", gap: 12, padding: "10px 8px", alignItems: "center" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, display: "grid", placeItems: "center", fontSize: 18 }}>{emo}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{name}</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>{qty} VENDIDOS</div>
                      </div>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>{rev}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}
    </ExpShell>
  );
}

function ExpPOS({ cardStyle = "elevated" }) {
  const products = [
    ["🍔","Burger Clásica","$18.000"],["🍟","Papas Grandes","$12.000"],["🥤","Limonada","$7.500"],["🌮","Tacos x3","$15.000"],
    ["🍕","Pizza Personal","$22.000"],["🥗","Ensalada","$16.500"],["🍗","Alitas BBQ","$24.000"],["🍦","Helado","$8.000"],
    ["🍩","Donut","$5.500"],["🥪","Sandwich","$13.000"],["🌭","Hot Dog","$11.000"],["🍰","Brownie","$9.000"],
  ];
  return (
    <ExpShell active="ord" cardStyle={cardStyle}>
      {(cs) => (
        <main className="main-exp">
          <div className="topbar-exp">
            <div className="crumbs-exp">SPOT / Pedidos / <strong>POS</strong></div>
            <div className="topbar-exp-spacer" />
            <button className="pill-btn">Mesas · 5 abiertas</button>
            <button className="pill-btn primary">{Iexp.plus} Mesa nueva</button>
          </div>
          <div className="content-exp" style={{ overflow: "hidden" }}>
            <div className="pos-exp">
              <div className={`pos-cat-exp pos-cat-exp-style-${cs}`}>
                <div className="pos-search-exp">
                  <div style={{ flex: 1, position: "relative" }}>
                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }}>{Iexp.search}</span>
                    <input className="pos-search-input" placeholder="Buscar producto…" />
                  </div>
                </div>
                <div className="cats-exp">
                  {["Todos","🍔 Burgers","🍕 Pizzas","🥤 Bebidas","🍦 Postres","🌮 Mexicano","🥗 Saludable"].map((c,i)=>(
                    <button key={c} className={`cat-pill ${i===0?"active":""}`}>{c}</button>
                  ))}
                </div>
                <div className="pos-grid-exp">
                  {products.map(([emo,name,price])=>(
                    <button key={name} className="pos-item-exp">
                      <div className="pos-item-img-exp">{emo}</div>
                      <div className="pos-item-name-exp">{name}</div>
                      <div className="pos-item-price-exp">{price}</div>
                      <button className="pos-item-add">+</button>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pos-cart-exp">
                <div className="cart-head-exp">
                  <h3>Mesa 04</h3>
                  <span className="cart-count">3 ITEMS</span>
                </div>
                <div className="cart-items-exp">
                  {[["🍔","Burger Clásica",2,"$36.000"],["🍟","Papas Grandes",1,"$12.000"],["🥤","Limonada",2,"$15.000"]].map(([emo,name,qty,p])=>(
                    <div key={name} className="cart-row-exp">
                      <div className="cart-thumb-exp">{emo}</div>
                      <div>
                        <div className="cart-name-exp">{name}</div>
                        <div className="cart-meta-exp">×{qty}</div>
                      </div>
                      <div className="cart-price-exp">{p}</div>
                    </div>
                  ))}
                </div>
                <div className="cart-totals-exp">
                  <div className="cart-line-exp"><span>Subtotal</span><span className="v">$63.000</span></div>
                  <div className="cart-line-exp"><span>IVA 19%</span><span className="v">$11.970</span></div>
                  <div className="cart-line-exp"><span>Descuento</span><span className="v" style={{ color: "var(--exp-accent)" }}>−$5.000</span></div>
                  <div className="cart-total-exp">
                    <span className="lbl">A pagar</span>
                    <span className="v">$69.970</span>
                  </div>
                  <button className="pay-btn-exp">Cobrar →</button>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}
    </ExpShell>
  );
}

function ExpOrders({ cardStyle = "elevated" }) {
  const rows = [
    ["#1284","María González","Hoy 14:32","$54.000","Pagado","Completado","pos","pos"],
    ["#1283","Carlos Ruiz","Hoy 14:18","$32.500","Pagado","En proceso","pos","info"],
    ["#1282","Ana Pérez","Hoy 13:55","$78.200","Pendiente","Pendiente","warn","warn"],
    ["#1281","Diego Torres","Hoy 13:40","$21.800","Pagado","Completado","pos","pos"],
    ["#1280","Consumidor final","Hoy 13:22","$45.600","Pagado","Pendiente","pos","warn"],
    ["#1279","Lucía Mejía","Hoy 12:50","$92.300","Pagado","Completado","pos","pos"],
    ["#1278","Andrés Vélez","Hoy 12:30","$18.200","Reembolsado","Cancelado","err","err"],
  ];
  return (
    <ExpShell active="ord" cardStyle={cardStyle}>
      {(cs) => (
        <main className="main-exp">
          <div className="topbar-exp">
            <div className="crumbs-exp">SPOT / <strong>Pedidos</strong></div>
            <div className="topbar-exp-spacer" />
            <div style={{ display: "flex", gap: 6 }}>
              <button className="pill-btn">Hoy</button>
              <button className="pill-btn">Exportar</button>
              <button className="pill-btn accent">{Iexp.plus} Nuevo</button>
            </div>
          </div>
          <div className="content-exp">
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 700, letterSpacing: "-0.04em", margin: 0 }}>
                  Pedidos <em style={{ color: "var(--exp-accent)", fontStyle: "italic", fontWeight: 400 }}>de hoy</em>
                </h1>
                <div style={{ color: "var(--ink-3)", marginTop: 8, fontSize: 14 }}>47 pedidos · 5 en cola · $1.842.500 facturado</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Todos","Pendiente","En proceso","Completado","Cancelado"].map((t,i)=>(
                  <button key={t} className={`pill-btn ${i===0?"primary":""}`}>{t}</button>
                ))}
              </div>
            </div>
            <div className={`panel-exp panel-exp-style-${cs}`}>
              <table className="tbl-exp">
                <thead>
                  <tr><th>Orden</th><th>Cliente</th><th>Cuándo</th><th>Total</th><th>Pago</th><th>Estado</th><th></th></tr>
                </thead>
                <tbody>
                  {rows.map(([code,name,date,total,pay,st,paytone,sttone])=>(
                    <tr key={code}>
                      <td><span className="order-code">{code}</span></td>
                      <td>{name}</td>
                      <td style={{ color: "var(--ink-3)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{date}</td>
                      <td><span className="order-amount">{total}</span></td>
                      <td><span className={`tag-exp ${paytone}`}><span className="tag-dot" />{pay}</span></td>
                      <td><span className={`tag-exp ${sttone}`}><span className="tag-dot" />{st}</span></td>
                      <td style={{ textAlign: "right" }}><button className="pill-btn" style={{ padding: "5px 12px", fontSize: 12 }}>Abrir</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}
    </ExpShell>
  );
}

function ExpStorefront() {
  return (
    <div className="frame">
      <div className="store-exp">
        <nav className="nav">
          <div className="nav-brand"><span className="dot" />sandy papas.</div>
          <div className="nav-spacer" />
          <a className="nav-link" style={{ marginRight: 18 }}>Menú</a>
          <a className="nav-link" style={{ marginRight: 18 }}>Reservar</a>
          <a className="nav-link" style={{ marginRight: 18 }}>Sobre</a>
          <button className="nav-cart-btn">Carrito <span className="badge">2</span></button>
        </nav>
        <div className="hero-store">
          <div>
            <h1>Burgers <em>recién hechas.</em><br />Comida con <em>cariño</em>.</h1>
            <p>Carne 100% fresca, papas cortadas a mano y limonada de coco. Recoge en tienda o pide a domicilio en menos de 25 min.</p>
            <div className="hero-meta">
              <span className="hero-meta-item"><span className="star">★</span> 4.8 · 320 reseñas</span>
              <span className="hero-meta-item">📍 Cra 13 #45-22</span>
              <span className="hero-meta-item">🕐 Abierto · cierra 11pm</span>
            </div>
            <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
              <button className="pill-btn primary" style={{ padding: "12px 22px", fontSize: 14 }}>Ordenar ahora →</button>
              <button className="pill-btn" style={{ padding: "12px 22px", fontSize: 14 }}>Reservar mesa</button>
            </div>
          </div>
          <div className="hero-img-block">
            <span className="badge-special">★ Combo del día</span>
          </div>
        </div>
        <div className="cats-store">
          {["⭐ Todos","🍔 Burgers","🍕 Pizzas","🌮 Mexicano","🥤 Bebidas","🍦 Postres","🥗 Saludable"].map((c,i)=>(
            <button key={c} className={`cat-store ${i===0?"active":""}`}>{c}</button>
          ))}
        </div>
        <div className="menu-grid">
          {[
            ["🍔","BESTSELLER","Burger Clásica","Carne 150g, queso, lechuga, tomate y nuestra salsa secreta.","$18.000"],
            ["🍔","NUEVO","Doble Bacon","Doble carne, doble queso y bacon crocante. Para hambrientos.","$26.000"],
            ["🍕","FAVORITO","Pizza Margarita","Masa madre, mozzarella, San Marzano, albahaca fresca.","$22.000"],
            ["🌮","PICANTE","Tacos al Pastor","Tres tacos con cebolla, cilantro y piña asada.","$15.000"],
            ["🥤","REFRESCANTE","Limonada de coco","Limonada cremosa, perfecta para acompañar.","$7.500"],
            ["🍦","DULCE","Brownie c/ helado","Brownie tibio con bola de helado de vainilla.","$11.000"],
          ].map(([emo,tag,name,desc,price])=>(
            <div key={name} className="menu-card">
              <div className="menu-img">{emo}</div>
              <div className="menu-info">
                <div className="menu-tag">{tag}</div>
                <div className="menu-name">{name}</div>
                <div className="menu-desc">{desc}</div>
                <div className="menu-bottom">
                  <div className="menu-price">{price}</div>
                  <button className="menu-add">+</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="floating-cart">
          <span className="cart-icon">🛒</span>
          <div>
            <div className="cart-summary">2 ITEMS</div>
            <div className="cart-amt">$44.000</div>
          </div>
          <span style={{ marginLeft: 8 }}>→</span>
        </div>
      </div>
    </div>
  );
}

window.ExpDashboard = ExpDashboard;
window.ExpPOS = ExpPOS;
window.ExpOrders = ExpOrders;
window.ExpStorefront = ExpStorefront;

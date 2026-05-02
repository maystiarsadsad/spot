/* global React, SpotIcons, SpotSpark */
const I = SpotIcons;
const Spark = SpotSpark;

// ─── SAFE — Dashboard ───────────────────────────────────────
function SafeShell({ children, active = "dash", cardStyle = "elevated" }) {
  const navItems = [
    { k: "dash", label: "Panel", icon: I.dash },
    { k: "res", label: "Reservas", icon: I.cal },
    { k: "ord", label: "Pedidos", icon: I.cart, badge: "12" },
    { k: "cat", label: "Catálogo", icon: I.pkg },
    { k: "inv", label: "Inventario", icon: I.warehouse },
    { k: "fin", label: "Finanzas", icon: I.cash },
    { k: "team", label: "Equipo", icon: I.team },
    { k: "cli", label: "Clientes", icon: I.contacts },
    { k: "rep", label: "Reportes", icon: I.reports },
    { k: "web", label: "Mi Página", icon: I.globe },
  ];
  return (
    <div className="frame safe">
      <div className="shell">
        <aside className="sidebar">
          <button className="sb-business">
            <div className="sb-logo">SP</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sb-business-name sb-text">Sandy Papas</div>
              <div className="sb-business-meta sb-text">Comida Rápida</div>
            </div>
            <span className="sb-chev">{I.chevUD}</span>
          </button>
          <div className="sb-section sb-text">Menú</div>
          {navItems.map((n) => (
            <a key={n.k} className={`sb-item ${active === n.k ? "active" : ""}`}>
              <span className="sb-icon">{n.icon}</span>
              <span className="sb-text">{n.label}</span>
              {n.badge && <span className="sb-badge sb-text">{n.badge}</span>}
            </a>
          ))}
          <div style={{ marginTop: "auto" }}>
            <a className="sb-item">
              <span className="sb-icon">{I.cog}</span>
              <span className="sb-text">Configuración</span>
            </a>
            <div className="sb-footer">
              <button className="sb-user">
                <div className="sb-avatar">JM</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sb-user-name sb-text">Juan Martínez</div>
                  <div className="sb-user-email sb-text">juan@spot.co</div>
                </div>
              </button>
            </div>
          </div>
        </aside>
        {children(cardStyle)}
      </div>
    </div>
  );
}

function SafeDashboard({ cardStyle = "elevated" }) {
  return (
    <SafeShell active="dash" cardStyle={cardStyle}>
      {(cs) => (
        <main className="main">
          <div className="topbar">
            <div className="crumbs">Spot · <strong>Panel</strong></div>
            <div className="topbar-spacer" />
            <div className="search">
              <span>{I.search}</span>
              <span style={{ flex: 1 }}>Buscar pedidos, clientes, productos…</span>
              <kbd>⌘K</kbd>
            </div>
            <button className="icon-btn" style={{ position: "relative" }}>{I.bell}<span className="dot" /></button>
            <button className="btn btn-primary">{I.plus} Nuevo pedido</button>
          </div>
          <div className="content">
            <div className="page-head">
              <div>
                <div className="page-title">Buen día, Juan</div>
                <div className="page-subtitle">Esto pasó en Sandy Papas hoy.</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn">Hoy ▾</button>
                <button className="btn">Exportar</button>
              </div>
            </div>

            <div className="grid-stats">
              <div className={`stat-card stat-card-style-${cs}`}>
                <div className="stat-label">Ventas hoy</div>
                <div className="stat-val">$1.842.500</div>
                <div className="stat-row"><span className="stat-trend-up">↑ 12.4%</span><span style={{ color: "var(--text-3)" }}>vs ayer</span></div>
                <Spark data={[3,5,4,7,6,9,8,11,10,12,14]} />
              </div>
              <div className={`stat-card stat-card-style-${cs}`}>
                <div className="stat-label">Pedidos</div>
                <div className="stat-val">47</div>
                <div className="stat-row"><span className="stat-trend-up">↑ 8</span><span style={{ color: "var(--text-3)" }}>en cola: 5</span></div>
                <Spark data={[2,3,5,4,6,5,7,8,7,9,10]} />
              </div>
              <div className={`stat-card stat-card-style-${cs}`}>
                <div className="stat-label">Ticket promedio</div>
                <div className="stat-val">$39.200</div>
                <div className="stat-row"><span className="stat-trend-down">↓ 2.1%</span><span style={{ color: "var(--text-3)" }}>vs semana</span></div>
                <Spark data={[10,9,11,10,12,11,10,9,11,10,9]} />
              </div>
              <div className={`stat-card stat-card-style-${cs}`}>
                <div className="stat-label">Clientes nuevos</div>
                <div className="stat-val">8</div>
                <div className="stat-row"><span className="stat-trend-up">↑ 33%</span><span style={{ color: "var(--text-3)" }}>vs ayer</span></div>
                <Spark data={[1,2,1,3,2,4,3,5,4,6,7]} />
              </div>
            </div>

            <div className="row-flex">
              <div className="panel">
                <div className="panel-head">
                  <div className="panel-title">Pedidos recientes</div>
                  <a className="panel-link">Ver todos →</a>
                </div>
                <table className="tbl">
                  <thead>
                    <tr><th>Orden</th><th>Cliente</th><th>Total</th><th>Estado</th></tr>
                  </thead>
                  <tbody>
                    {[
                      ["#1284","María González","$54.000","Completado","success"],
                      ["#1283","Carlos Ruiz","$32.500","En proceso","info"],
                      ["#1282","Ana Pérez","$78.200","Pendiente","warn"],
                      ["#1281","Diego Torres","$21.800","Completado","success"],
                      ["#1280","Lucía Mejía","$45.600","Pendiente","warn"],
                    ].map(([code,name,total,st,tone]) => (
                      <tr key={code}>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{code}</td>
                        <td><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span className="avatar-sm">{name.split(" ").map(n=>n[0]).join("")}</span>{name}</span></td>
                        <td style={{ fontWeight: 600 }}>{total}</td>
                        <td><span className={`tag tag-${tone}`}><span className="tag-dot" />{st}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="panel">
                <div className="panel-head">
                  <div className="panel-title">Top productos</div>
                  <a className="panel-link">Esta semana</a>
                </div>
                <div style={{ padding: 8 }}>
                  {[
                    ["🍔","Hamburguesa Clásica",24,"$432.000"],
                    ["🍟","Papas grandes",18,"$216.000"],
                    ["🥤","Limonada",15,"$112.500"],
                    ["🌮","Tacos",12,"$180.000"],
                    ["🍕","Pizza personal",9,"$153.000"],
                  ].map(([emo,name,qty,rev]) => (
                    <div key={name} style={{ display: "grid", gridTemplateColumns: "32px 1fr auto", gap: 12, padding: "10px 12px", alignItems: "center", borderRadius: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface-2)", display: "grid", placeItems: "center", fontSize: 16 }}>{emo}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                        <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{qty} vendidos</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{rev}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}
    </SafeShell>
  );
}

// ─── SAFE — POS ─────────────────────────────────────────────
function SafePOS({ cardStyle = "elevated" }) {
  const products = [
    ["🍔","Burger Clásica","$18.000"],["🍟","Papas Grandes","$12.000"],["🥤","Limonada","$7.500"],["🌮","Tacos x3","$15.000"],
    ["🍕","Pizza Personal","$22.000"],["🥗","Ensalada César","$16.500"],["🍗","Alitas BBQ","$24.000"],["🍦","Helado","$8.000"],
    ["🍩","Donut","$5.500"],["🥪","Sandwich","$13.000"],["🌭","Hot Dog","$11.000"],["🍰","Brownie","$9.000"],
  ];
  return (
    <SafeShell active="ord" cardStyle={cardStyle}>
      {(cs) => (
        <main className="main">
          <div className="topbar">
            <div className="crumbs">Spot · Pedidos · <strong>POS</strong></div>
            <div className="topbar-spacer" />
            <button className="btn">Pedidos abiertos · 5</button>
            <button className="btn btn-primary">{I.plus} Mesa nueva</button>
          </div>
          <div className="content" style={{ paddingBottom: 0 }}>
            <div className="pos">
              <div className="pos-catalog">
                <div className="pos-search-bar">
                  <div className="search" style={{ flex: 1, width: "auto" }}>
                    <span>{I.search}</span>
                    <span style={{ flex: 1 }}>Buscar productos…</span>
                  </div>
                </div>
                <div className="pos-cats">
                  {["Todos","🍔 Burgers","🍕 Pizzas","🥤 Bebidas","🍦 Postres","🌮 Mexicano","🥗 Saludable"].map((c,i)=>(
                    <button key={c} className={`pos-cat ${i===0?"active":""}`}>{c}</button>
                  ))}
                </div>
                <div className="pos-grid">
                  {products.map(([emo,name,price])=>(
                    <button key={name} className="pos-item">
                      <div className="pos-item-img">{emo}</div>
                      <div className="pos-item-name">{name}</div>
                      <div className="pos-item-price">{price}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pos-cart">
                <div className="cart-head">
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Mesa 04</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)" }}>3 productos</div>
                  </div>
                  <button className="btn">Cliente +</button>
                </div>
                <div className="cart-items">
                  {[["🍔","Burger Clásica",2,"$18.000"],["🍟","Papas Grandes",1,"$12.000"],["🥤","Limonada",2,"$7.500"]].map(([emo,name,qty,p])=>(
                    <div key={name} className="cart-row">
                      <div className="cart-thumb">{emo}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-3)" }}>{p}</div>
                      </div>
                      <div className="cart-qty">
                        <button>−</button><span className="qty">{qty}</span><button>+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="cart-totals">
                  <div className="cart-line"><span className="lbl">Subtotal</span><span>$63.000</span></div>
                  <div className="cart-line"><span className="lbl">IVA 19%</span><span>$11.970</span></div>
                  <div className="cart-line"><span className="lbl">Descuento</span><span>−$5.000</span></div>
                  <div className="cart-line cart-total"><span>Total</span><span>$69.970</span></div>
                  <button className="cart-pay">Cobrar →</button>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}
    </SafeShell>
  );
}

// ─── SAFE — Orders ──────────────────────────────────────────
function SafeOrders({ cardStyle = "elevated" }) {
  const rows = [
    ["#1284","María González","Hoy 14:32","$54.000","Pagado","Completado","success","success"],
    ["#1283","Carlos Ruiz","Hoy 14:18","$32.500","Pagado","En proceso","success","info"],
    ["#1282","Ana Pérez","Hoy 13:55","$78.200","Pendiente","Pendiente","warn","warn"],
    ["#1281","Diego Torres","Hoy 13:40","$21.800","Pagado","Completado","success","success"],
    ["#1280","Consumidor final","Hoy 13:22","$45.600","Pagado","Pendiente","success","warn"],
    ["#1279","Lucía Mejía","Hoy 12:50","$92.300","Pagado","Completado","success","success"],
    ["#1278","Andrés Vélez","Hoy 12:30","$18.200","Reembolsado","Cancelado","danger","danger"],
  ];
  return (
    <SafeShell active="ord" cardStyle={cardStyle}>
      {(cs) => (
        <main className="main">
          <div className="topbar">
            <div className="crumbs">Spot · <strong>Pedidos</strong></div>
            <div className="topbar-spacer" />
            <div className="search"><span>{I.search}</span><span style={{ flex: 1 }}>Buscar pedido o cliente</span></div>
            <button className="btn btn-primary">{I.plus} Nuevo pedido</button>
          </div>
          <div className="content">
            <div className="page-head">
              <div>
                <div className="page-title">Pedidos</div>
                <div className="page-subtitle">47 hoy · 5 en cola · $1.842.500 facturado</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {["Todos","Pendiente","En proceso","Completado","Cancelado"].map((t,i)=>(
                  <button key={t} className={`btn ${i===0?"btn-primary":""}`}>{t}</button>
                ))}
              </div>
            </div>
            <div className={`panel`} style={{ boxShadow: cs === "elevated" ? "var(--shadow-sm)" : "none", border: cs === "plain" ? "none" : undefined }}>
              <table className="tbl">
                <thead>
                  <tr><th>Orden</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Pago</th><th>Estado</th><th></th></tr>
                </thead>
                <tbody>
                  {rows.map(([code,name,date,total,pay,st,paytone,sttone])=>(
                    <tr key={code}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{code}</td>
                      <td><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span className="avatar-sm">{name.split(" ").map(n=>n[0]).join("").slice(0,2)}</span>{name}</span></td>
                      <td style={{ color: "var(--text-3)" }}>{date}</td>
                      <td style={{ fontWeight: 600 }}>{total}</td>
                      <td><span className={`tag tag-${paytone}`}><span className="tag-dot" />{pay}</span></td>
                      <td><span className={`tag tag-${sttone}`}><span className="tag-dot" />{st}</span></td>
                      <td style={{ textAlign: "right" }}><button className="btn" style={{ padding: "5px 10px", fontSize: 12 }}>Ver</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}
    </SafeShell>
  );
}

// ─── SAFE — Storefront ──────────────────────────────────────
function SafeStorefront() {
  return (
    <div className="frame">
      <div className="store-safe">
        <nav className="nav-safe">
          <div className="brand-safe"><div className="brand-mark-safe">SP</div>Sandy Papas</div>
          <div className="nav-spacer" />
          <a style={{ fontSize: 13, color: "var(--safe-text-2)", marginRight: 16 }}>Menú</a>
          <a style={{ fontSize: 13, color: "var(--safe-text-2)", marginRight: 16 }}>Reservar</a>
          <a style={{ fontSize: 13, color: "var(--safe-text-2)", marginRight: 16 }}>Contacto</a>
          <button className="cart-btn-safe">{I.cart} Carrito · 0</button>
        </nav>
        <div className="hero-safe">
          <div>
            <h1>Comida rápida hecha con calma.</h1>
            <p>Hamburguesas, papas y bebidas preparadas al momento, listas en minutos. Recoge en tienda o te las llevamos.</p>
            <div className="hero-cta">
              <button className="btn btn-primary" style={{ padding: "10px 18px" }}>Ver menú</button>
              <button className="btn" style={{ padding: "10px 18px" }}>Hacer reserva</button>
            </div>
          </div>
          <div className="hero-img-safe">🍔</div>
        </div>
        <div className="menu-section">
          <div className="menu-cats">
            {["Todos","🍔 Burgers","🍕 Pizzas","🥤 Bebidas","🍦 Postres","🌮 Mexicano"].map((c,i)=>(
              <button key={c} className={`menu-cat ${i===0?"active":""}`}>{c}</button>
            ))}
          </div>
          <div className="menu-grid-safe">
            {[
              ["🍔","Burger Clásica","Carne 150g, queso cheddar, lechuga, tomate y nuestra salsa.","$18.000"],
              ["🍔","Doble Bacon","Doble carne, doble queso y bacon crocante. Para los hambrientos.","$26.000"],
              ["🍕","Pizza Margarita","Masa madre, mozzarella, tomate San Marzano y albahaca.","$22.000"],
              ["🌮","Tacos al Pastor","Tres tacos con cebolla, cilantro y piña.","$15.000"],
              ["🥤","Limonada de coco","Limonada cremosa, perfecta para acompañar.","$7.500"],
              ["🍦","Brownie con helado","Brownie casero tibio con helado de vainilla.","$11.000"],
            ].map(([emo,name,desc,price])=>(
              <div key={name} className="menu-card-safe">
                <div className="menu-img-safe">{emo}</div>
                <div className="menu-body">
                  <div className="menu-name-safe">{name}</div>
                  <div className="menu-desc-safe">{desc}</div>
                </div>
                <div className="menu-bottom-safe">
                  <div className="menu-price-safe">{price}</div>
                  <button className="menu-add-safe">Agregar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.SafeDashboard = SafeDashboard;
window.SafePOS = SafePOS;
window.SafeOrders = SafeOrders;
window.SafeStorefront = SafeStorefront;

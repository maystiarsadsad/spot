/* global React, SpotIcons */
const Iex2 = SpotIcons;

// ── INVENTARIO ────────────────────────────────────────────────
function ExpInventario({ cardStyle = "elevated" }) {
  const rows = [
    ["🍔", "Carne molida 150g", "INV-001", 142, 50, "$3.200", "Bodega A", "ok"],
    ["🥖", "Pan brioche", "INV-014", 38, 80, "$900", "Bodega A", "low"],
    ["🧀", "Queso cheddar", "INV-022", 6, 30, "$1.400", "Refri 1", "crit"],
    ["🥬", "Lechuga", "INV-008", 24, 20, "$600", "Refri 2", "ok"],
    ["🍅", "Tomate fresco", "INV-009", 11, 25, "$520", "Refri 2", "low"],
    ["🥔", "Papa pelada", "INV-031", 95, 40, "$1.100", "Bodega B", "ok"],
    ["🥤", "Coca-Cola 350ml", "INV-101", 220, 100, "$2.500", "Bebidas", "ok"],
    ["🍋", "Limón", "INV-044", 0, 30, "$300", "Refri 2", "crit"],
  ];
  const tone = (s) => s === "crit" ? "err" : s === "low" ? "warn" : "pos";
  const lbl = (s) => s === "crit" ? "Crítico" : s === "low" ? "Bajo" : "OK";
  return (
    <window.ExpShell active="inv" cardStyle={cardStyle}>
      {(cs) => (
        <main className="main-exp">
          <div className="topbar-exp">
            <div className="crumbs-exp">SPOT / <strong>Inventario</strong></div>
            <div className="topbar-exp-spacer" />
            <button className="pill-btn">Importar CSV</button>
            <button className="pill-btn primary">{Iex2.plus} Producto</button>
          </div>
          <div className="content-exp">
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22 }}>
              <div>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 700, letterSpacing: "-0.04em", margin: 0, lineHeight: 1 }}>
                  Lo que tienes <em style={{ color: "var(--exp-accent)", fontStyle: "italic", fontWeight: 400 }}>en bodega</em>.
                </h1>
                <div style={{ color: "var(--ink-3)", marginTop: 10, fontSize: 14 }}>536 SKUs · 3 críticos · valor total $42.8M</div>
              </div>
            </div>

            <div className="stats-row" style={{ marginBottom: 18 }}>
              <div className={`stat stat-style-${cs} pop-orange`}>
                <div className="stat-lbl-exp"><span className="stat-icon-exp">{Iex2.warehouse}</span>Valor inventario</div>
                <div className="stat-val-exp">$42.8M</div>
                <div className="stat-delta-exp">{Iex2.arrowUp} 4.2% mes</div>
              </div>
              <div className={`stat stat-style-${cs}`}>
                <div className="stat-lbl-exp"><span className="stat-icon-exp">{Iex2.pkg}</span>SKUs activos</div>
                <div className="stat-val-exp">536</div>
                <div className="stat-delta-exp">12 nuevos</div>
              </div>
              <div className={`stat stat-style-${cs} pop-rose`} style={{ background: "var(--exp-rose)", color: "var(--exp-ink)" }}>
                <div className="stat-lbl-exp" style={{ color: "var(--exp-ink)" }}><span className="stat-icon-exp" style={{ background: "rgba(0,0,0,0.08)" }}>!</span>Bajos / críticos</div>
                <div className="stat-val-exp">12</div>
                <div className="stat-delta-exp">3 sin stock</div>
              </div>
              <div className={`stat stat-style-${cs} pop-mint`}>
                <div className="stat-lbl-exp"><span className="stat-icon-exp">{Iex2.reports}</span>Rotación 30d</div>
                <div className="stat-val-exp">3.4×</div>
                <div className="stat-delta-exp">{Iex2.arrowUp} sano</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              {["Todos","Bajos","Críticos","Sin stock","Refrigerados","Bebidas"].map((t,i)=>(
                <button key={t} className={`pill-btn ${i===0?"primary":""}`}>{t}</button>
              ))}
              <div style={{ flex: 1 }} />
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }}>{Iex2.search}</span>
                <input className="pos-search-input" placeholder="Buscar SKU o nombre…" style={{ paddingLeft: 36, minWidth: 220 }} />
              </div>
            </div>

            <div className={`panel-exp panel-exp-style-${cs}`}>
              <table className="tbl-exp">
                <thead>
                  <tr><th></th><th>Producto</th><th>SKU</th><th>Stock</th><th>Mín</th><th>Costo</th><th>Ubicación</th><th>Estado</th><th></th></tr>
                </thead>
                <tbody>
                  {rows.map(([emo, name, sku, stock, min, cost, loc, st]) => (
                    <tr key={sku}>
                      <td><div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bg-2)", display: "grid", placeItems: "center", fontSize: 18 }}>{emo}</div></td>
                      <td style={{ fontWeight: 600 }}>{name}</td>
                      <td><span className="order-code">{sku}</span></td>
                      <td><span className="order-amount">{stock}</span></td>
                      <td style={{ color: "var(--ink-3)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{min}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{cost}</td>
                      <td style={{ color: "var(--ink-3)", fontSize: 13 }}>{loc}</td>
                      <td><span className={`tag-exp ${tone(st)}`}><span className="tag-dot" />{lbl(st)}</span></td>
                      <td style={{ textAlign: "right" }}><button className="pill-btn" style={{ padding: "5px 12px", fontSize: 12 }}>Ajustar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}
    </window.ExpShell>
  );
}

// ── FINANZAS ──────────────────────────────────────────────────
function ExpFinanzas({ cardStyle = "elevated" }) {
  const days = [40, 55, 38, 72, 65, 90, 82, 60, 78, 95, 88, 102, 78];
  const max = Math.max(...days);
  return (
    <window.ExpShell active="fin" cardStyle={cardStyle}>
      {(cs) => (
        <main className="main-exp">
          <div className="topbar-exp">
            <div className="crumbs-exp">SPOT / <strong>Finanzas</strong></div>
            <div className="topbar-exp-spacer" />
            <button className="pill-btn">Octubre 2025</button>
            <button className="pill-btn primary">Exportar reporte</button>
          </div>
          <div className="content-exp">
            <div style={{ marginBottom: 22 }}>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 700, letterSpacing: "-0.04em", margin: 0, lineHeight: 1 }}>
                Tus números, <em style={{ color: "var(--exp-accent)", fontStyle: "italic", fontWeight: 400 }}>sin maquillaje</em>.
              </h1>
              <div style={{ color: "var(--ink-3)", marginTop: 10, fontSize: 14 }}>Octubre 2025 · 13 días corridos · cierre proyectado $58.4M</div>
            </div>

            <div className="stats-row" style={{ marginBottom: 18 }}>
              <div className={`stat stat-style-${cs} pop-orange`}>
                <div className="stat-lbl-exp"><span className="stat-icon-exp">{Iex2.cash}</span>Ingresos</div>
                <div className="stat-val-exp">$24.6M</div>
                <div className="stat-delta-exp">{Iex2.arrowUp} 18% vs sept</div>
              </div>
              <div className={`stat stat-style-${cs}`}>
                <div className="stat-lbl-exp">Gastos</div>
                <div className="stat-val-exp">$11.2M</div>
                <div className="stat-delta-exp">{Iex2.arrowUp} 6%</div>
              </div>
              <div className={`stat stat-style-${cs} pop-mint`}>
                <div className="stat-lbl-exp">Utilidad neta</div>
                <div className="stat-val-exp">$13.4M</div>
                <div className="stat-delta-exp">margen 54.5%</div>
              </div>
              <div className={`stat stat-style-${cs} pop-violet`}>
                <div className="stat-lbl-exp">Por cobrar</div>
                <div className="stat-val-exp">$2.1M</div>
                <div className="stat-delta-exp">7 facturas</div>
              </div>
            </div>

            <div className="panel-row">
              <div className={`panel-exp panel-exp-style-${cs}`} style={{ minHeight: 360 }}>
                <div className="panel-head-exp">
                  <div className="panel-title-exp">Flujo <em>diario</em></div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="pill-btn primary" style={{ fontSize: 11, padding: "5px 12px" }}>13d</button>
                    <button className="pill-btn" style={{ fontSize: 11, padding: "5px 12px" }}>30d</button>
                    <button className="pill-btn" style={{ fontSize: 11, padding: "5px 12px" }}>Año</button>
                  </div>
                </div>
                <div style={{ padding: "20px 22px 24px" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 200, borderBottom: "1px dashed var(--line)", paddingBottom: 8 }}>
                    {days.map((v, i) => (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                        <div style={{
                          width: "100%", height: `${(v / max) * 100}%`,
                          background: i === days.length - 1 ? "var(--exp-accent)" : "var(--exp-ink)",
                          borderRadius: "4px 4px 0 0",
                          position: "relative",
                        }}>
                          {i === days.length - 1 && (
                            <div style={{ position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--exp-accent)", whiteSpace: "nowrap" }}>HOY</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.06em" }}>
                    <span>1 OCT</span><span>5</span><span>9</span><span>13 OCT</span>
                  </div>
                </div>
              </div>

              <div className={`panel-exp panel-exp-style-${cs}`}>
                <div className="panel-head-exp">
                  <div className="panel-title-exp">Gastos por <em>categoría</em></div>
                </div>
                <div style={{ padding: "16px 18px" }}>
                  {[
                    ["Insumos cocina", 4200000, 38, "var(--exp-accent)"],
                    ["Nómina", 3800000, 34, "var(--exp-ink)"],
                    ["Servicios", 1400000, 12, "var(--exp-violet)"],
                    ["Marketing", 980000, 9, "var(--exp-mint)"],
                    ["Otros", 820000, 7, "var(--exp-rose)"],
                  ].map(([name, val, pct, c]) => (
                    <div key={name} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                        <span style={{ fontWeight: 600 }}>{name}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>${(val / 1000000).toFixed(1)}M · {pct}%</span>
                      </div>
                      <div style={{ height: 8, background: "var(--bg-2)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct * 2.5}%`, background: c, borderRadius: 999 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`panel-exp panel-exp-style-${cs}`} style={{ marginTop: 18 }}>
              <div className="panel-head-exp">
                <div className="panel-title-exp">Movimientos <em>recientes</em></div>
                <button className="pill-btn">Ver todos →</button>
              </div>
              <table className="tbl-exp">
                <thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Método</th><th style={{ textAlign: "right" }}>Monto</th></tr></thead>
                <tbody>
                  {[
                    ["13 Oct", "Venta — Pedidos día", "Ingreso", "Mixto", "+$1.842.500", "in"],
                    ["13 Oct", "Compra carne · Frigorífico", "Insumos", "Transferencia", "−$2.100.000", "out"],
                    ["12 Oct", "Pago nómina semanal", "Nómina", "PSE", "−$3.800.000", "out"],
                    ["12 Oct", "Venta — Domicilios", "Ingreso", "Tarjeta", "+$1.245.800", "in"],
                    ["11 Oct", "Servicios públicos", "Servicios", "Débito", "−$420.000", "out"],
                  ].map(([d, c, cat, m, amt, dir]) => (
                    <tr key={c + d}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-3)" }}>{d}</td>
                      <td style={{ fontWeight: 600 }}>{c}</td>
                      <td><span className="tag-exp">{cat}</span></td>
                      <td style={{ fontSize: 13, color: "var(--ink-3)" }}>{m}</td>
                      <td style={{ textAlign: "right" }}><span className="order-amount" style={{ color: dir === "in" ? "#1d4d28" : "var(--exp-accent)" }}>{amt}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}
    </window.ExpShell>
  );
}

// ── RESERVAS ──────────────────────────────────────────────────
function ExpReservas({ cardStyle = "elevated" }) {
  const slots = ["12:00","12:30","13:00","13:30","14:00","19:00","19:30","20:00","20:30","21:00"];
  const tables = [
    { id: "M01", seats: 2, status: "free" },
    { id: "M02", seats: 4, status: "occupied", who: "Ramírez · 19:30" },
    { id: "M03", seats: 4, status: "reserved", who: "González · 20:00" },
    { id: "M04", seats: 6, status: "occupied", who: "Torres · 19:00" },
    { id: "M05", seats: 2, status: "free" },
    { id: "M06", seats: 8, status: "reserved", who: "Cumpleaños Mejía · 20:30" },
    { id: "M07", seats: 4, status: "free" },
    { id: "M08", seats: 2, status: "occupied", who: "Ruiz · 19:45" },
    { id: "M09", seats: 4, status: "reserved", who: "Pérez · 21:00" },
    { id: "M10", seats: 2, status: "free" },
  ];
  const tColor = { free: "var(--exp-mint)", occupied: "var(--exp-accent)", reserved: "var(--exp-accent-2)" };
  const tInk = { free: "#1d4d28", occupied: "#fff", reserved: "var(--exp-ink)" };
  return (
    <window.ExpShell active="res" cardStyle={cardStyle}>
      {(cs) => (
        <main className="main-exp">
          <div className="topbar-exp">
            <div className="crumbs-exp">SPOT / <strong>Reservas</strong></div>
            <div className="topbar-exp-spacer" />
            <button className="pill-btn">Lunes 13 Oct</button>
            <button className="pill-btn primary">{Iex2.plus} Nueva reserva</button>
          </div>
          <div className="content-exp">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>
              <div>
                <div style={{ marginBottom: 18 }}>
                  <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 700, letterSpacing: "-0.04em", margin: 0, lineHeight: 1 }}>
                    Esta noche <em style={{ color: "var(--exp-accent)", fontStyle: "italic", fontWeight: 400 }}>tienes lleno</em>.
                  </h1>
                  <div style={{ color: "var(--ink-3)", marginTop: 8, fontSize: 14 }}>14 reservas confirmadas · 6 mesas libres · próxima en 18 min</div>
                </div>

                <div className={`panel-exp panel-exp-style-${cs}`} style={{ marginBottom: 16 }}>
                  <div className="panel-head-exp">
                    <div className="panel-title-exp">Mapa <em>del salón</em></div>
                    <div style={{ display: "flex", gap: 12, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--ink-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--exp-mint)" }} />Libre</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--exp-accent-2)" }} />Reservada</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--exp-accent)" }} />Ocupada</span>
                    </div>
                  </div>
                  <div style={{ padding: 22, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
                    {tables.map((t) => (
                      <div key={t.id} style={{
                        background: tColor[t.status],
                        color: tInk[t.status],
                        borderRadius: 18,
                        padding: 14,
                        minHeight: 92,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        border: "1px solid var(--line)",
                        boxShadow: t.status === "occupied" ? "2px 2px 0 var(--ink)" : "none",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, letterSpacing: "-0.02em" }}>{t.id}</span>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, opacity: 0.8 }}>{t.seats}p</span>
                        </div>
                        <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1.3 }}>
                          {t.who || "Disponible"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`panel-exp panel-exp-style-${cs}`}>
                  <div className="panel-head-exp">
                    <div className="panel-title-exp">Slots <em>de hoy</em></div>
                  </div>
                  <div style={{ padding: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {slots.map((s, i) => (
                      <button key={s} className={`pill-btn ${i % 3 === 0 ? "primary" : ""}`} style={{ minWidth: 80, justifyContent: "center" }}>
                        {s} {i % 3 === 0 ? "✓" : ""}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className={`panel-exp panel-exp-style-${cs}`}>
                  <div className="panel-head-exp">
                    <div className="panel-title-exp">Próximas</div>
                  </div>
                  <div style={{ padding: "10px 0" }}>
                    {[
                      ["19:00", "Familia Torres", "M04 · 6p", "Confirmada", "pos"],
                      ["19:30", "Ramírez", "M02 · 4p", "Confirmada", "pos"],
                      ["19:45", "Ruiz", "M08 · 2p", "Llegó", "info"],
                      ["20:00", "González", "M03 · 4p", "Sin confirmar", "warn"],
                      ["20:30", "Cumple Mejía", "M06 · 8p", "Confirmada", "pos"],
                      ["21:00", "Pérez", "M09 · 4p", "Confirmada", "pos"],
                    ].map(([t, who, mesa, st, tone]) => (
                      <div key={t + who} style={{ padding: "12px 18px", borderBottom: "1px dashed var(--line)" }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>{t}</span>
                          <span className={`tag-exp ${tone}`} style={{ fontSize: 10 }}><span className="tag-dot" />{st}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{who}</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{mesa}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </main>
      )}
    </window.ExpShell>
  );
}

// ── REPORTES ──────────────────────────────────────────────────
function ExpReportes({ cardStyle = "elevated" }) {
  return (
    <window.ExpShell active="rep" cardStyle={cardStyle}>
      {(cs) => (
        <main className="main-exp">
          <div className="topbar-exp">
            <div className="crumbs-exp">SPOT / <strong>Reportes</strong></div>
            <div className="topbar-exp-spacer" />
            <button className="pill-btn">Octubre 2025</button>
            <button className="pill-btn primary">Descargar PDF</button>
          </div>
          <div className="content-exp">
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22 }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--exp-accent)", textTransform: "uppercase", letterSpacing: "0.12em" }}>★ Reporte mensual</div>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: 48, fontWeight: 700, letterSpacing: "-0.04em", margin: "8px 0 0", lineHeight: 1 }}>
                  Octubre fue <em style={{ color: "var(--exp-accent)", fontStyle: "italic", fontWeight: 400 }}>el mejor mes</em>.
                </h1>
                <div style={{ color: "var(--ink-3)", marginTop: 10, fontSize: 14, maxWidth: 540 }}>$58.4M en ventas, 18% más que septiembre. Tu mejor día fue el sábado 11 de octubre con $4.2M.</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 18 }}>
              <div className={`panel-exp panel-exp-style-${cs}`} style={{ background: "var(--exp-ink)", color: "#fff", borderColor: "var(--exp-ink)" }}>
                <div style={{ padding: "26px 28px" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--exp-accent-2)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>Mejor día del mes</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 64, fontWeight: 700, letterSpacing: "-0.05em", lineHeight: 0.95, marginTop: 8 }}>
                    Sábado <em style={{ fontStyle: "italic", color: "var(--exp-accent)", fontWeight: 400 }}>11</em>
                  </div>
                  <div style={{ display: "flex", gap: 28, marginTop: 22 }}>
                    <div>
                      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", opacity: 0.6, letterSpacing: "0.08em", textTransform: "uppercase" }}>Ventas</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, marginTop: 2 }}>$4.2M</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", opacity: 0.6, letterSpacing: "0.08em", textTransform: "uppercase" }}>Pedidos</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, marginTop: 2 }}>112</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", opacity: 0.6, letterSpacing: "0.08em", textTransform: "uppercase" }}>Ticket</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, marginTop: 2 }}>$37.5K</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={`panel-exp panel-exp-style-${cs} pop-orange`} style={{ background: "var(--exp-accent)", color: "#fff", borderColor: "var(--exp-accent)" }}>
                <div style={{ padding: "26px 28px" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.85, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>Producto estrella</div>
                  <div style={{ fontSize: 56, marginTop: 6 }}>🍔</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", marginTop: 4 }}>Burger Clásica</div>
                  <div style={{ marginTop: 16, fontFamily: "var(--font-mono)", fontSize: 13, opacity: 0.95 }}>724 vendidas · $13.0M · 22% del total</div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 18 }}>
              {[
                ["Hora pico", "8:30 PM", "viernes y sábados"],
                ["Día más bajo", "Lunes", "promedio $1.1M"],
                ["Cliente top", "María González", "12 visitas · $620K"],
              ].map(([lbl, val, sub]) => (
                <div key={lbl} className={`panel-exp panel-exp-style-${cs}`} style={{ padding: 22 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 700, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{lbl}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", marginTop: 8 }}>{val}</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4 }}>{sub}</div>
                </div>
              ))}
            </div>

            <div className={`panel-exp panel-exp-style-${cs}`}>
              <div className="panel-head-exp">
                <div className="panel-title-exp">Comparativo <em>vs septiembre</em></div>
              </div>
              <div style={{ padding: 22 }}>
                {[
                  ["Ventas", "$58.4M", "$49.5M", 18, "up"],
                  ["Pedidos", "1.486", "1.302", 14, "up"],
                  ["Clientes nuevos", "212", "187", 13, "up"],
                  ["Costo de insumos", "$24.1M", "$21.0M", 15, "up"],
                  ["Devoluciones", "8", "14", 43, "down"],
                ].map(([m, now, before, pct, dir]) => (
                  <div key={m} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 80px", gap: 16, padding: "14px 0", borderBottom: "1px dashed var(--line)", alignItems: "center" }}>
                    <div style={{ fontWeight: 600 }}>{m}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>{now}</div>
                    <div style={{ fontFamily: "var(--font-mono)", color: "var(--ink-3)", fontSize: 13 }}>{before}</div>
                    <div style={{ textAlign: "right" }}>
                      <span className={`tag-exp ${dir === "up" ? (m === "Costo de insumos" ? "warn" : "pos") : "pos"}`}>
                        {dir === "up" ? "▲" : "▼"} {pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}
    </window.ExpShell>
  );
}

// ── AUTH (Login) ──────────────────────────────────────────────
function ExpAuth() {
  return (
    <div className="frame exp">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100%", background: "var(--bg)" }}>
        <div style={{ padding: "60px 80px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--exp-ink)", color: "var(--exp-accent-2)", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, boxShadow: "2px 2px 0 var(--exp-accent)" }}>S</div>
            <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>spot.</div>
          </div>

          <div style={{ maxWidth: 420 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--exp-accent)", letterSpacing: "0.14em", textTransform: "uppercase" }}>★ Bienvenido de vuelta</div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 56, fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 0.98, margin: "12px 0 14px" }}>
              Buenos días,<br /><em style={{ color: "var(--exp-accent)", fontStyle: "italic", fontWeight: 400 }}>vendedor</em>.
            </h1>
            <p style={{ color: "var(--ink-3)", fontSize: 15, lineHeight: 1.5, margin: 0 }}>Entra a tu negocio. Ya hay 3 pedidos esperando.</p>

            <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>Correo</label>
                <input className="pos-search-input" defaultValue="juan@sandypapas.co" style={{ width: "100%", padding: "12px 14px", fontSize: 15 }} />
              </div>
              <div>
                <label style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-3)", display: "block", marginBottom: 6 }}>Contraseña</label>
                <input className="pos-search-input" type="password" defaultValue="••••••••" style={{ width: "100%", padding: "12px 14px", fontSize: 15 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-2)", cursor: "pointer" }}>
                  <span style={{ width: 18, height: 18, borderRadius: 4, background: "var(--exp-ink)", display: "grid", placeItems: "center", color: "var(--exp-accent-2)", fontWeight: 700, fontSize: 12 }}>✓</span>
                  Mantener sesión
                </label>
                <a style={{ fontSize: 13, color: "var(--exp-accent)", fontWeight: 600, textDecoration: "underline", textDecorationStyle: "dashed", textUnderlineOffset: 4 }}>¿Olvidaste tu clave?</a>
              </div>
              <button className="pill-btn primary" style={{ padding: "14px 22px", fontSize: 15, marginTop: 6, justifyContent: "center", borderRadius: 999 }}>
                Entrar al negocio →
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0", color: "var(--ink-3)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                <span style={{ flex: 1, height: 1, borderTop: "1px dashed var(--line)" }} />o<span style={{ flex: 1, height: 1, borderTop: "1px dashed var(--line)" }} />
              </div>
              <button className="pill-btn" style={{ padding: "12px 20px", fontSize: 14, justifyContent: "center" }}>
                Continuar con Google
              </button>
            </div>
          </div>

          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.06em" }}>
            ¿Aún no tienes cuenta? <a style={{ color: "var(--exp-ink)", fontWeight: 700, textDecoration: "underline", textDecorationStyle: "dashed", textUnderlineOffset: 4 }}>Empieza gratis</a>
          </div>
        </div>

        <div style={{ background: "var(--exp-ink)", color: "#fff", padding: 60, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1.5px, transparent 1.5px)", backgroundSize: "16px 16px", opacity: 0.6 }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{
              display: "inline-block",
              transform: "rotate(-3deg)",
              background: "var(--exp-accent-2)",
              color: "var(--exp-ink)",
              padding: "6px 14px",
              borderRadius: 6,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              border: "1.5px solid var(--exp-ink)",
            }}>★ Hoy en Spot</div>
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 60, fontWeight: 700, letterSpacing: "-0.045em", lineHeight: 0.98 }}>
              Vendiste <em style={{ color: "var(--exp-accent)", fontStyle: "italic", fontWeight: 400 }}>$1.84M</em> hoy.<br />
              Eso son <em style={{ color: "var(--exp-accent-2)", fontStyle: "italic", fontWeight: 400 }}>47 sonrisas</em>.
            </div>
            <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18 }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, opacity: 0.55, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>Mes</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, marginTop: 4 }}>$58.4M</div>
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, opacity: 0.55, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>Pedidos</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, marginTop: 4 }}>1.486</div>
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, opacity: 0.55, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>Clientes</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, marginTop: 4 }}>+212</div>
              </div>
            </div>
          </div>

          <div style={{ position: "relative", zIndex: 1, fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.5, letterSpacing: "0.06em" }}>
            spot · v2026.10 · seguro y privado
          </div>
        </div>
      </div>
    </div>
  );
}

window.ExpInventario = ExpInventario;
window.ExpFinanzas = ExpFinanzas;
window.ExpReservas = ExpReservas;
window.ExpReportes = ExpReportes;
window.ExpAuth = ExpAuth;

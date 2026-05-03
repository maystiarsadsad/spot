"use server";

/**
 * Looks up a barcode in Open Food Facts (free, no API key needed).
 * Returns product info if found, or null.
 */
export async function lookupBarcode(barcode: string) {
  if (!barcode || barcode.length < 8) {
    return { found: false as const };
  }

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { next: { revalidate: 86400 } } // cache for 24h
    );

    if (!res.ok) return { found: false as const };

    const data = await res.json();

    if (data.status !== 1 || !data.product) {
      return { found: false as const };
    }

    const p = data.product;

    // Build a friendly product name
    const name =
      p.product_name_es ||
      p.product_name ||
      p.generic_name_es ||
      p.generic_name ||
      null;

    // Try to determine category
    const rawCategories = p.categories_tags || [];
    const category = inferCategory(rawCategories, p.categories || "");

    // Brand
    const brand = p.brands || null;

    // Quantity / unit
    const quantity = p.quantity || null;
    const unit = inferUnit(quantity);

    return {
      found: true as const,
      product: {
        name: name ? `${brand ? brand + " " : ""}${name}`.trim() : brand || barcode,
        category,
        brand,
        quantity,
        unit,
        imageUrl: p.image_front_small_url || p.image_url || null,
      },
    };
  } catch (e) {
    console.error("Barcode lookup error:", e);
    return { found: false as const };
  }
}

function inferCategory(tags: string[], raw: string): string {
  const lower = (tags.join(",") + "," + raw).toLowerCase();

  if (lower.includes("cerveza") || lower.includes("beer")) return "Cervezas";
  if (lower.includes("licor") || lower.includes("spirit") || lower.includes("aguardiente") || lower.includes("ron") || lower.includes("whisky") || lower.includes("vodka") || lower.includes("tequila")) return "Licores";
  if (lower.includes("gaseosa") || lower.includes("soda") || lower.includes("carbonated") || lower.includes("cola")) return "Gaseosas";
  if (lower.includes("agua") || lower.includes("water")) return "Bebidas";
  if (lower.includes("jugo") || lower.includes("juice")) return "Bebidas";
  if (lower.includes("energi") || lower.includes("energy")) return "Bebidas";
  if (lower.includes("cigarr") || lower.includes("tobacco") || lower.includes("cigarette")) return "Cigarrillos";
  if (lower.includes("chocolate") || lower.includes("candy") || lower.includes("dulce") || lower.includes("confite")) return "Dulces";
  if (lower.includes("snack") || lower.includes("chip") || lower.includes("papa")) return "Snacks";
  if (lower.includes("galleta") || lower.includes("cookie") || lower.includes("biscuit")) return "Dulces";
  if (lower.includes("pan") || lower.includes("bread")) return "Panadería";
  if (lower.includes("leche") || lower.includes("milk") || lower.includes("lácteo") || lower.includes("dairy")) return "Lácteos";
  if (lower.includes("carne") || lower.includes("meat") || lower.includes("pollo") || lower.includes("chicken")) return "Proteínas";
  if (lower.includes("cereal")) return "Cereales";
  if (lower.includes("aceite") || lower.includes("oil")) return "Aceites";
  if (lower.includes("salsa") || lower.includes("sauce")) return "Salsas";

  return "General";
}

function inferUnit(quantity: string | null): string {
  if (!quantity) return "unidad";
  const lower = quantity.toLowerCase();
  if (lower.includes("ml") || lower.includes("litro") || lower.includes("l")) return "unidad";
  if (lower.includes("kg") || lower.includes("kilo")) return "kg";
  if (lower.includes("g")) return "unidad";
  return "unidad";
}

"use client";

import { useState, useMemo, useTransition } from "react";
import { formatCurrency } from "@/lib/utils";
import { createOrder } from "@/lib/actions/orders";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, Plus, Minus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface CatalogItem {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  image_url: string | null;
  active: boolean | null;
}

interface CartItem {
  item: CatalogItem;
  quantity: number;
}

interface Props {
  businessId: string;
  items: CatalogItem[];
  categories: Category[];
  currency: string;
}

export function POSClient({ businessId, items, categories, currency }: Props) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (!it.active) return false;
      const matchesSearch = it.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeTab === "all" || it.category_id === activeTab;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, activeTab]);

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, c) => acc + c.item.price * c.quantity, 0);
  }, [cart]);

  const tax = cartTotal * 0.19; // Static 19% tax for now, should ideally be configurable
  const subtotal = cartTotal - tax; // Assuming price includes tax for simplicity, but let's do classical: Subtotal + tax = total. Actually, let's treat the sum as total, and back-calculate tax if we want, or just set subtotal = total. Let's just keep it simple: total is total.
  // For POS quickly: 
  const total = cartTotal;

  function addToCart(item: CatalogItem) {
    setCart((prev) => {
      const ex = prev.find((c) => c.item.id === item.id);
      if (ex) {
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  }

  function updateQuantity(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) => (c.item.id === itemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  }

  function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) return;

    startTransition(async () => {
      const orderItems = cart.map(c => ({
        catalog_item_id: c.item.id,
        name: c.item.name,
        quantity: c.quantity,
        unit_price: c.item.price,
        total_price: c.item.price * c.quantity
      }));

      const result = await createOrder(businessId, {
        type: 'sale',
        customer_name: customerName,
        payment_method: paymentMethod,
        subtotal: total,
        tax: 0, // Placeholder
        discount: 0, // Placeholder
        total: total,
        items: orderItems
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Venta completada");
        setCart([]);
        setCheckoutOpen(false);
        setCustomerName("");
        setPaymentMethod("cash");
      }
    });
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-10rem)] min-h-[600px]">
      {/* Left side: Catalog */}
      <div className="lg:col-span-2 flex flex-col space-y-4 overflow-hidden rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar productos..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <ScrollArea className="w-full whitespace-nowrap pb-2">
            <TabsList className="w-full justify-start h-10 bg-transparent p-0">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
              >
                Todos
              </TabsTrigger>
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
                >
                  {cat.icon} {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="scrollbar-hide" />
          </ScrollArea>
        </Tabs>

        <ScrollArea className="flex-1 -mx-4 px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-4">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/50 bg-background hover:bg-accent/50 hover:border-accent transition-all text-center aspect-square gap-3"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    item.name.substring(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium line-clamp-2">{item.name}</div>
                  <div className="text-xs text-muted-foreground font-semibold mt-1">
                    {formatCurrency(item.price, currency)}
                  </div>
                </div>
              </button>
            ))}
            {filteredItems.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                No hay productos disponibles.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right side: Cart */}
      <div className="flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden h-full">
        <div className="p-4 border-b font-semibold flex items-center justify-between">
          <span>Orden Actual</span>
          <Badge variant="secondary">{cart.length} items</Badge>
        </div>

        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
              <ShoppingCart className="h-12 w-12 opacity-20" />
              <p>El carrito está vacío</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((c) => (
                <div key={c.item.id} className="flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm leading-tight">{c.item.name}</span>
                    <span className="font-semibold text-sm">
                      {formatCurrency(c.item.price * c.quantity, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">{formatCurrency(c.item.price, currency)} c/u</div>
                    <div className="flex items-center gap-2 border rounded-md p-0.5">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(c.item.id, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-xs w-4 text-center font-medium">{c.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(c.item.id, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 bg-muted/30 border-t space-y-4 mt-auto">
          <div className="flex items-center justify-between font-bold text-lg">
            <span>Total</span>
            <span>{formatCurrency(total, currency)}</span>
          </div>
          <Button
            className="w-full text-base py-6"
            onClick={() => setCheckoutOpen(true)}
            disabled={cart.length === 0}
          >
            Cobrar Orden
          </Button>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Completar Venta</DialogTitle>
            <DialogDescription>
              Confirma los detalles del pago
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCheckout} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Cliente (Opcional)</Label>
              <Input
                id="customer"
                placeholder="Nombre del cliente"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val || "cash")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo 💵</SelectItem>
                  <SelectItem value="card">Tarjeta 💳</SelectItem>
                  <SelectItem value="transfer">Transferencia 📲</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Items:</span>
                <span>{cart.length}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-xl">
                <span>Total:</span>
                <span className="text-primary">{formatCurrency(total, currency)}</span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCheckoutOpen(false)} disabled={isPending}> Cancelar </Button>
              <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirmar Pago
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

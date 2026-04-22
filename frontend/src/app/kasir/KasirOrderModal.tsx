import { useState, useEffect } from "react";
import { getMenuItems, getCategories, createOrder } from "@/lib/api";
import type { MenuItem, Category } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Trash2, CheckCircle, Search } from "lucide-react";

interface CartItem extends MenuItem {
  quantity: number;
  notes: string;
}

export function KasirOrderModal({
  isOpen,
  onClose,
  onOrderCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
}) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && menuItems.length === 0) {
      Promise.all([getMenuItems({ available: true }), getCategories()]).then(
        ([items, cats]) => {
          setMenuItems(items);
          setCategories(cats);
        }
      );
    }
  }, [isOpen, menuItems.length]);

  const filteredItems = menuItems.filter((item) => {
    const matchCat = selectedCategory ? item.category_id === selectedCategory : true;
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1, notes: "" }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      await createOrder({
        customer_name: customerName.trim() || "Walk-in",
        items: cart.map((i) => ({
          menu_item_id: i.id,
          quantity: i.quantity,
          notes: i.notes,
        })),
      });
      onOrderCreated();
      onClose();
      setCart([]);
      setCustomerName("");
    } catch (err) {
      alert("Gagal membuat pesanan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl md:max-w-5xl w-[95vw] h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Buat Pesanan Walk-in</DialogTitle>
        </DialogHeader>
        <div className="flex-1 flex overflow-hidden">
          {/* Menu Selection (Left) */}
          <div className="flex-1 flex flex-col border-r bg-muted/20">
            <div className="p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  placeholder="Cari menu..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <Badge
                  variant={selectedCategory === null ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(null)}
                >
                  Semua
                </Badge>
                {categories.map((cat) => (
                  <Badge
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    className="cursor-pointer whitespace-nowrap"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    {cat.name}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="bg-card border rounded-lg p-3 text-left hover:border-primary transition-colors flex flex-col"
                >
                  <span className="font-bold text-sm leading-tight mb-1">{item.name}</span>
                  <span className="text-primary font-mono text-xs mt-auto">
                    {formatPrice(item.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Cart (Right) */}
          <div className="w-80 flex flex-col bg-card shrink-0">
            <div className="p-4 border-b">
              <Input
                placeholder="Nama Pelanggan (opsional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="bg-muted/50 p-2 rounded-lg text-sm">
                  <div className="flex justify-between font-medium mb-1">
                    <span>{item.name}</span>
                    <span className="font-mono">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Input
                      placeholder="Catatan..."
                      className="h-7 text-xs w-32"
                      value={item.notes}
                      onChange={(e) =>
                        setCart((prev) =>
                          prev.map((i) =>
                            i.id === item.id ? { ...i, notes: e.target.value } : i
                          )
                        )
                      }
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 bg-background rounded border">
                        <Minus size={12} />
                      </button>
                      <span className="w-4 text-center font-bold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 bg-background rounded border">
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="text-center text-muted-foreground mt-10">
                  Keranjang kosong
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-muted/20">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold">Total</span>
                <span className="text-xl font-bold font-mono text-primary">
                  {formatPrice(total)}
                </span>
              </div>
              <Button
                className="w-full cursor-pointer"
                disabled={cart.length === 0 || isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? "Memproses..." : "Buat Pesanan"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

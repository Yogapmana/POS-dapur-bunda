import { useState, useEffect } from "react";
import { getMenuItems, getCategories, createOrder } from "@/lib/api";
import type { MenuItem, Category } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Trash2, CheckCircle, Search, Package } from "lucide-react";

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
    } catch (err: any) {
      console.error("Order creation failed:", err);
      alert(`Gagal membuat pesanan: ${err.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl md:max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
        {/* Header - Glassmorphism effect */}
        <div className="bg-primary px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <DialogTitle className="text-white text-xl font-heading">
                Buat Pesanan Walk-in
              </DialogTitle>
              <p className="text-white/70 text-xs mt-0.5">
                Input pesanan manual untuk pelanggan di tempat
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-row overflow-hidden bg-background">
          {/* Menu Selection (Left) */}
          <div className="flex-1 flex flex-col border-r border-border/50 bg-muted/5 min-w-0">
            <div className="p-6 space-y-5">
              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input
                    placeholder="Cari menu lezat..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-12 rounded-xl bg-card border-border/50 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide scroll-smooth">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${
                    selectedCategory === null
                      ? "bg-primary text-white border-primary shadow-md shadow-primary/20 scale-105"
                      : "bg-card text-muted-foreground border-border/50 hover:border-primary/50"
                  }`}
                >
                  Semua
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? "bg-primary text-white border-primary shadow-md shadow-primary/20 scale-105"
                        : "bg-card text-muted-foreground border-border/50 hover:border-primary/50"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="flex-1 overflow-y-auto p-6 pt-0">
              {filteredItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20">
                  <Search size={48} className="opacity-20 mb-4" />
                  <p>Tidak ada menu yang cocok</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredItems.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => addToCart(item)}
                      className="group bg-card border border-border/40 rounded-2xl overflow-hidden text-left hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col relative"
                    >
                      {/* Price Badge */}
                      <div className="absolute top-2 right-2 z-10">
                        <div className="bg-primary/90 text-white px-2 py-1 rounded-lg text-[10px] font-bold font-mono backdrop-blur-sm">
                          {formatPrice(item.price)}
                        </div>
                      </div>

                      {/* Image Placeholder or Actual Image */}
                      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                            <Plus size={32} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      <div className="p-3 flex flex-col flex-1">
                        <span className="font-bold text-sm leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                          {item.name}
                        </span>
                        <div className="mt-auto flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                            {categories.find(c => c.id === item.category_id)?.name}
                          </span>
                          <div className="bg-secondary/10 p-1.5 rounded-lg group-hover:bg-secondary/20 transition-colors">
                            <Plus className="text-secondary" size={14} />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart (Right) */}
          <div className="w-96 flex flex-col bg-card shrink-0 border-l border-border/50 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
            <div className="p-6 border-b border-border/50 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold font-heading text-lg">Keranjang</h3>
                <Badge variant="secondary" className="px-2 py-0.5 rounded-md">
                  {cart.length} Item
                </Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={14} />
                <Input
                  placeholder="Nama Pelanggan (Walk-in)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="pl-9 h-10 rounded-xl bg-muted/30 border-transparent focus:bg-card focus:border-primary/30 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="bg-muted/30 p-3 rounded-2xl border border-border/20 transition-all hover:bg-muted/50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 pr-2">
                      <p className="font-bold text-sm leading-tight">{item.name}</p>
                      <p className="text-primary font-mono text-xs mt-1">
                        {formatPrice(item.price)}
                      </p>
                    </div>
                    <button 
                      onClick={() => updateQuantity(item.id, -item.quantity)}
                      className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <Input
                      placeholder="Catatan porsi/request..."
                      className="h-8 text-[10px] flex-1 rounded-lg bg-card border-border/40"
                      value={item.notes}
                      onChange={(e) =>
                        setCart((prev) =>
                          prev.map((i) =>
                            i.id === item.id ? { ...i, notes: e.target.value } : i
                          )
                        )
                      }
                    />
                    <div className="flex items-center bg-card rounded-xl border border-border/50 p-1 shadow-sm">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)} 
                        className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)} 
                        className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded-lg transition-colors text-primary"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {cart.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40 text-center py-20">
                  <Package size={64} className="mb-4 stroke-[1px]" />
                  <p className="text-sm">Belum ada menu<br/>dalam keranjang</p>
                </div>
              )}
            </div>

            {/* Cart Footer */}
            <div className="p-6 border-t border-border/50 bg-muted/5 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold text-lg">Total</span>
                  <span className="text-2xl font-bold font-mono text-primary tracking-tighter">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>
              <Button
                className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                disabled={cart.length === 0 || isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memproses...
                  </div>
                ) : (
                  "Konfirmasi Pesanan"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


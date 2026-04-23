"use client";

import { useState, useEffect, use } from "react";
import {
  getMenuItems,
  getCategories,
  getTableByToken,
  createOrder,
} from "@/lib/api";
import type { MenuItem, Category, Table } from "@/lib/api";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShoppingBag, Plus, Minus, Trash2, CheckCircle, X } from "lucide-react";

export default function SelfOrderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [table, setTable] = useState<Table | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState("");

  const {
    items: cartItems,
    addItem,
    removeItem,
    updateQuantity,
    updateNotes,
    clearCart,
    getTotalItems,
    getTotalPrice,
  } = useCartStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [items, cats] = await Promise.all([
          getMenuItems({ available: true }),
          getCategories(),
        ]);
        setMenuItems(items);
        setCategories(cats);

        // Try to find the table by token
        try {
          const t = await getTableByToken(token);
          setTable(t);
        } catch {
          // Token not found — still show menu
        }
      } catch (err) {
        console.error("Failed to fetch menu:", err);
      }
    };
    fetchData();
  }, [token]);

  const filteredItems = selectedCategory
    ? menuItems.filter((item) => item.category_id === selectedCategory)
    : menuItems;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);

  const handleAddToCart = (item: MenuItem) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
    });
  };

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    try {
      const orderData = {
        table_id: table?.id,
        customer_name: customerName.trim() || "",
        items: cartItems.map((item) => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          notes: item.notes || "",
        })),
      };
      const result = await createOrder(orderData);
      setOrderSuccess(result.id);
      clearCart();
      setIsConfirmOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal mengirim pesanan");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success screen
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-[#FFFDF7] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
          <CheckCircle size={40} className="text-success" />
        </div>
        <h1 className="text-3xl font-display text-primary mb-2">
          Pesanan Terkirim!
        </h1>
        <p className="text-muted-foreground mb-2">
          Nomor pesanan Anda:
        </p>
        <p className="text-5xl font-bold font-mono text-secondary mb-6">
          #{orderSuccess}
        </p>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto bg-amber-500/10 text-amber-600 p-3 rounded-lg border border-amber-500/20">
          <strong>Penting:</strong> Harap segera melakukan pembayaran di Kasir agar pesanan dapat diproses oleh Dapur.
        </p>
        <Button
          onClick={() => setOrderSuccess(null)}
          className="mt-8 bg-primary hover:bg-primary/90 cursor-pointer"
        >
          Pesan Lagi
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF7] text-foreground font-sans relative pb-24">
      {/* Hero Section */}
      <header className="relative h-48 bg-primary overflow-hidden rounded-b-[2rem]">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <div className="absolute z-20 top-8 left-6 text-white">
          <h1 className="text-4xl font-display leading-tight">
            Dapur
            <br />
            Bunda
          </h1>
          <p className="opacity-90 mt-1 flex items-center gap-2 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            Meja {table?.number || token}
          </p>
        </div>
      </header>

      {/* Categories */}
      <div className="mt-6 px-4">
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
              selectedCategory === null
                ? "bg-secondary text-secondary-foreground"
                : "bg-white border border-border text-muted-foreground"
            }`}
          >
            Semua
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                selectedCategory === cat.id
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-white border border-border text-muted-foreground"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid */}
      <div className="px-4 mt-2">
        <h2 className="text-2xl font-bold mb-4 font-heading text-primary">
          Menu Kami
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const cartItem = cartItems.find((ci) => ci.id === item.id);
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow-sm border border-border/50 overflow-hidden flex flex-col transition-all active:scale-[0.98]"
              >
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                      <Plus size={32} />
                    </div>
                  )}
                  {/* Category badge */}
                  <div className="absolute top-2 left-2 z-10">
                    <Badge className="bg-primary/90 text-white text-[9px] px-2 py-0.5 border-none backdrop-blur-sm">
                      {categories.find(c => c.id === item.category_id)?.name}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <h3 className="font-bold text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
                    {item.name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 h-7 leading-tight">
                    {item.description}
                  </p>
                  
                  <div className="mt-3 flex flex-col gap-2">
                    <span className="font-bold text-primary text-sm font-mono leading-none">
                      {formatPrice(item.price)}
                    </span>
                    
                    <div className="flex items-center justify-between gap-1 h-9">
                      {cartItem ? (
                        <div className="flex items-center bg-muted/50 rounded-lg p-0.5 w-full justify-between">
                          <button
                            onClick={() =>
                              updateQuantity(item.id, cartItem.quantity - 1)
                            }
                            className="w-7 h-7 rounded-md bg-white shadow-sm flex items-center justify-center text-primary active:bg-muted transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-xs font-bold px-1">
                            {cartItem.quantity}
                          </span>
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="w-7 h-7 rounded-md bg-secondary text-secondary-foreground shadow-sm flex items-center justify-center active:bg-secondary/80 transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleAddToCart(item)}
                          size="sm"
                          className="w-full h-8 rounded-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground text-[11px] font-bold py-0"
                        >
                          Tambah
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Cart Bar */}
      {getTotalItems() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-50 bg-gradient-to-t from-white via-white to-transparent pt-12 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <Button
              onClick={() => setIsCartOpen(true)}
              className="w-full h-14 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-2xl shadow-lg flex items-center justify-between px-6 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingBag size={20} />
                  <span className="absolute -top-1 -right-2 bg-destructive text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {getTotalItems()}
                  </span>
                </div>
                <span className="font-semibold text-sm">Lihat Pesanan</span>
              </div>
              <span className="font-bold font-mono">
                {formatPrice(getTotalPrice())}
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* Cart Dialog */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Keranjang Pesanan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {formatPrice(item.price)} × {item.quantity} ={" "}
                    {formatPrice(item.price * item.quantity)}
                  </p>
                  <Input
                    placeholder="Catatan (opsional)"
                    value={item.notes || ""}
                    onChange={(e) => updateNotes(item.id, e.target.value)}
                    className="mt-2 h-8 text-xs"
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        updateQuantity(item.id, item.quantity - 1)
                      }
                      className="w-6 h-6 rounded bg-muted flex items-center justify-center"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.id, item.quantity + 1)
                      }
                      className="w-6 h-6 rounded bg-secondary text-secondary-foreground flex items-center justify-center"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-destructive mt-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            <div className="border-t pt-3 flex justify-between items-center">
              <span className="font-bold">Total</span>
              <span className="text-xl font-bold font-mono text-primary">
                {formatPrice(getTotalPrice())}
              </span>
            </div>

            <Button
              onClick={() => {
                setIsCartOpen(false);
                setIsConfirmOpen(true);
              }}
              className="w-full h-12 bg-secondary hover:bg-secondary/90 text-secondary-foreground cursor-pointer"
            >
              Lanjut ke Konfirmasi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Pesanan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Nama Pemesan (Opsional)
              </label>
              <Input
                placeholder="Masukkan nama Anda"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full"
              />
            </div>
            
            <p className="text-sm text-muted-foreground">
              Pastikan pesanan Anda sudah benar sebelum mengirim:
            </p>

            <div className="divide-y divide-border">
              {cartItems.map((item) => (
                <div key={item.id} className="py-2 flex justify-between text-sm">
                  <span>
                    {item.name} × {item.quantity}
                    {item.notes && (
                      <span className="block text-xs text-muted-foreground italic">
                        {item.notes}
                      </span>
                    )}
                  </span>
                  <span className="font-mono">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 flex justify-between items-center">
              <span className="font-bold">Total</span>
              <span className="text-xl font-bold font-mono text-primary">
                {formatPrice(getTotalPrice())}
              </span>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsConfirmOpen(false)}
                className="flex-1 cursor-pointer"
              >
                <X size={16} className="mr-2" />
                Ubah
              </Button>
              <Button
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
                className="flex-1 bg-success hover:bg-success/90 text-white cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="animate-pulse">Mengirim...</span>
                ) : (
                  <>
                    <CheckCircle size={16} className="mr-2" />
                    Kirim Pesanan
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

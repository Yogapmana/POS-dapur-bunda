"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getMenuItems,
  getCategories,
  createMenuItem,
  deleteMenuItem,
  toggleMenuAvailability,
} from "@/lib/api";
import type { MenuItem, Category } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Eye, EyeOff, Search } from "lucide-react";

export default function MenuManagementPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // New item form state
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    price: 0,
    category_id: 0,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [items, cats] = await Promise.all([
        getMenuItems(
          selectedCategory ? { category_id: selectedCategory } : undefined
        ),
        getCategories(),
      ]);
      setMenuItems(items);
      setCategories(cats);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMenuItem({
        ...newItem,
        is_available: true,
      });
      setNewItem({ name: "", description: "", price: 0, category_id: 0 });
      setIsDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error("Failed to create item:", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Yakin ingin menghapus menu ini?")) return;
    try {
      await deleteMenuItem(id);
      fetchData();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await toggleMenuAvailability(id);
      fetchData();
    } catch (err) {
      console.error("Failed to toggle:", err);
    }
  };

  const filteredItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Menu & Kategori</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola daftar menu restoran Anda
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger
            render={
              <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground cursor-pointer">
                <Plus size={18} className="mr-2" />
                Tambah Menu
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Menu Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateItem} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nama Menu</label>
                <Input
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  placeholder="Contoh: Nasi Goreng Spesial"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Deskripsi</label>
                <Input
                  value={newItem.description}
                  onChange={(e) =>
                    setNewItem({ ...newItem, description: e.target.value })
                  }
                  placeholder="Deskripsi singkat menu"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Harga (Rp)</label>
                <Input
                  type="number"
                  value={newItem.price || ""}
                  onChange={(e) =>
                    setNewItem({ ...newItem, price: Number(e.target.value) })
                  }
                  placeholder="25000"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Kategori</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={newItem.category_id}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      category_id: Number(e.target.value),
                    })
                  }
                  required
                >
                  <option value={0}>Pilih kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 cursor-pointer"
              >
                Simpan Menu
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Cari menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="cursor-pointer"
          >
            Semua
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className="cursor-pointer"
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Menu Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Daftar Menu ({filteredItems.length} item)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse text-muted-foreground">
                Memuat data...
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p>Belum ada menu.</p>
              <p className="text-sm">
                Klik &quot;Tambah Menu&quot; untuk memulai.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Nama</th>
                    <th className="pb-3 font-medium">Kategori</th>
                    <th className="pb-3 font-medium">Harga</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-3">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge variant="outline">{item.category?.name}</Badge>
                      </td>
                      <td className="py-3 font-mono font-medium">
                        {formatPrice(item.price)}
                      </td>
                      <td className="py-3">
                        <Badge
                          className={
                            item.is_available
                              ? "bg-success/10 text-success border-success/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          }
                        >
                          {item.is_available ? "Tersedia" : "Habis"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggle(item.id)}
                            title={
                              item.is_available
                                ? "Tandai Habis"
                                : "Tandai Tersedia"
                            }
                            className="cursor-pointer"
                          >
                            {item.is_available ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            className="text-destructive hover:text-destructive cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

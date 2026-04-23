"use client";

import { useState, useEffect, useCallback } from "react";
import { getUsers, createUser, updateUser, deleteUser, User } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Search, Users } from "lucide-react";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "kasir",
};

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const fetchUsersData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsersData();
  }, [fetchUsersData]);

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "", // Leave blank unless they want to change it
      role: user.role,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const payload: any = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        };
        if (formData.password) payload.password = formData.password;
        await updateUser(editingUser.id, payload);
      } else {
        await createUser(formData);
      }
      setFormData(emptyForm);
      setEditingUser(null);
      setIsDialogOpen(false);
      fetchUsersData();
    } catch (err: any) {
      console.error("Failed to save user:", err);
      alert(err.message || "Gagal menyimpan data pengguna");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Yakin ingin menghapus pengguna ini?")) return;
    try {
      await deleteUser(id);
      fetchUsersData();
    } catch (err: any) {
      console.error("Failed to delete user:", err);
      alert(err.message || "Gagal menghapus pengguna");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Manajemen Akun</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola akun Admin dan Kasir
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-secondary hover:bg-secondary/90 text-secondary-foreground cursor-pointer"
        >
          <Plus size={18} className="mr-2" />
          Tambah Akun
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit Akun" : "Tambah Akun Baru"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Lengkap</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Budi Santoso"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="kasir1@dapurbunda.com"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Password {editingUser && <span className="text-muted-foreground text-xs font-normal">(Kosongkan jika tidak ingin diubah)</span>}
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required={!editingUser}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="kasir">Kasir</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 cursor-pointer">
              {editingUser ? "Simpan Perubahan" : "Buat Akun"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Daftar Pengguna</CardTitle>
            <div className="relative w-64">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Cari nama/email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Memuat data...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users size={48} className="opacity-20 mb-4" />
              <p>Belum ada pengguna ditemukan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Nama</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 font-medium">{u.name}</td>
                      <td className="py-3 text-muted-foreground">{u.email}</td>
                      <td className="py-3">
                        <Badge
                          variant={u.role === "admin" ? "default" : "secondary"}
                          className={u.role === "admin" ? "bg-primary text-white" : "bg-muted text-foreground"}
                        >
                          {u.role.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(u)}
                            className="cursor-pointer h-8 w-8 p-0"
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(u.id)}
                            className="text-destructive hover:text-destructive cursor-pointer h-8 w-8 p-0"
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

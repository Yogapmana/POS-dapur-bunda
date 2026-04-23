const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8181/api";

// --- Helper ---
async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// --- Types ---
export interface Category {
  id: number;
  name: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

export interface MenuItem {
  id: number;
  category_id: number;
  category: Category;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: boolean;
}

export interface Table {
  id: number;
  number: string;
  qr_code_token: string;
  status: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  menu_item: MenuItem;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes: string;
}

export interface Payment {
  id: number;
  order_id: number;
  method: string;
  amount: number;
  change_amount: number;
  status: string;
  created_at: string;
}

export interface Order {
  id: number;
  table_id: number | null;
  table: Table | null;
  user_id: number | null;
  user: { id: number; name: string; email: string; role: string } | null;
  status: string;
  total_amount: number;
  customer_name: string;
  order_items: OrderItem[];
  payment: Payment | null;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export const getUsers = () => request<User[]>("/users");
export const updateUser = (id: number, data: Partial<User> & { password?: string }) => 
  request<User>(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
export const deleteUser = (id: number) =>
  request<{ message: string }>(`/users/${id}`, { method: "DELETE" });
export const createUser = (data: any) =>
  request<{ user: User }>("/register", {
    method: "POST",
    body: JSON.stringify(data),
  });


// --- Auth ---
export const login = (email: string, password: string) =>
  request<LoginResponse>("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

// --- Categories ---
export const getCategories = () => request<Category[]>("/categories");

export const createCategory = (data: Partial<Category>) =>
  request<Category>("/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateCategory = (id: number, data: Partial<Category>) =>
  request<Category>(`/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteCategory = (id: number) =>
  request<{ message: string }>(`/categories/${id}`, { method: "DELETE" });

// --- Menu Items ---
export const getMenuItems = (params?: {
  category_id?: number;
  available?: boolean;
}) => {
  const searchParams = new URLSearchParams();
  if (params?.category_id)
    searchParams.set("category_id", String(params.category_id));
  if (params?.available) searchParams.set("available", "true");
  const qs = searchParams.toString();
  return request<MenuItem[]>(`/menu${qs ? `?${qs}` : ""}`);
};

export const createMenuItem = (data: Partial<MenuItem>) =>
  request<MenuItem>("/menu", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateMenuItem = (id: number, data: Partial<MenuItem>) =>
  request<MenuItem>(`/menu/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteMenuItem = (id: number) =>
  request<{ message: string }>(`/menu/${id}`, { method: "DELETE" });

export const toggleMenuAvailability = (id: number) =>
  request<MenuItem>(`/menu/${id}/toggle`, { method: "PATCH" });

// --- Orders ---
export const getOrders = (params?: { status?: string; all?: boolean }) => {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.all) searchParams.set("all", "true");
  const qs = searchParams.toString();
  return request<Order[]>(`/orders${qs ? `?${qs}` : ""}`);
};

export const getOrderById = (id: number) => request<Order>(`/orders/${id}`);

export const createOrder = (data: {
  table_id?: number;
  customer_name?: string;
  items: { menu_item_id: number; quantity: number; notes?: string }[];
}) =>
  request<Order>("/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateOrderStatus = (id: number, status: string) =>
  request<Order>(`/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

// --- Payments ---
export const processPayment = (data: {
  order_id: number;
  method: string;
  amount: number;
}) =>
  request<{ message: string; order: Order; change_amount: number }>(
    "/payments",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );

export const getPaymentByOrderId = (orderId: number) =>
  request<Payment>(`/payments/order/${orderId}`);

// --- Tables ---
export const getTables = () => request<Table[]>("/tables");

export const getTableByToken = (token: string) =>
  request<Table>(`/tables/token/${token}`);

export const createTable = (data: Partial<Table>) =>
  request<Table>("/tables", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateTableStatus = (id: number, status: string) =>
  request<Table>(`/tables/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const deleteTable = (id: number) =>
  request<{ message: string }>(`/tables/${id}`, { method: "DELETE" });

// --- Reports ---
export interface ChartDataItem {
  label: string;
  value: number;
}

export interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}

export interface SalesSummary {
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
}

export interface InventoryItem {
  id: number;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: number;
  inventory_item_id: number;
  inventory_item?: InventoryItem;
  type: "in" | "out";
  quantity: number;
  notes: string;
  user_id: number;
  user?: { id: number; name: string };
  created_at: string;
}

export const getDailyReport = () => request<ChartDataItem[]>("/reports/daily");
export const getWeeklyReport = () => request<ChartDataItem[]>("/reports/weekly");
export const getMonthlyReport = () => request<ChartDataItem[]>("/reports/monthly");

export const getTopSellingItems = (period: string = "all") =>
  request<TopItem[]>(`/reports/top-items?period=${period}`);

export const getSalesSummary = (period: string = "all") =>
  request<SalesSummary>(`/reports/summary?period=${period}`);

export const exportSalesReport = (period = "all") => {
  const token = localStorage.getItem("token");
  const url = `${API_BASE}/reports/export?period=${period}`;
  
  // Download file using fetch to include headers
  return fetch(url, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  }).then(async (res) => {
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `sales_report_${period}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  });
};

// --- Inventory ---
export const getInventory = () => request<InventoryItem[]>("/inventory");
export const createInventoryItem = (data: Partial<InventoryItem>) =>
  request<InventoryItem>("/inventory", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateInventoryItem = (id: number, data: Partial<InventoryItem>) =>
  request<InventoryItem>(`/inventory/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
export const deleteInventoryItem = (id: number) =>
  request<{ message: string }>(`/inventory/${id}`, { method: "DELETE" });
export const addInventoryTransaction = (data: {
  inventory_item_id: number;
  type: "in" | "out";
  quantity: number;
  notes?: string;
}) =>
  request<InventoryTransaction>("/inventory/transactions", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const getInventoryTransactions = (id: number) =>
  request<InventoryTransaction[]>(`/inventory/${id}/transactions`);

export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("image", file);

  const res = await api.post("/api/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data.url;
};

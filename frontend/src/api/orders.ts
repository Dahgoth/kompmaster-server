import { z } from "zod";
import { apiRequest } from "@/api/client";
import { orderDetailSchema, orderSchema, type Order, type OrderDetail } from "@/api/schemas";
import { queryKeys } from "@/api/categories";

export interface CreateOrderInput {
  items: { productId: string; qty: number }[];
  receiveMethod: "pickup" | "delivery";
  address?: string;
  contactPhone: string;
}

/**
 * Order creation (atomic stock decrement server-side). Insufficient stock
 * arrives as 409 with a per-item message — the checkout view re-reads the
 * cart products and marks unavailable items on 409.
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  return apiRequest(orderSchema, "POST", "/orders", { scope: "user", body: input });
}

export async function fetchMyOrders(options: { signal?: AbortSignal } = {}): Promise<Order[]> {
  return apiRequest(z.array(orderSchema), "GET", "/orders/my", {
    scope: "user",
    signal: options.signal,
  });
}

export async function fetchMyOrder(
  id: string,
  options: { signal?: AbortSignal } = {},
): Promise<OrderDetail> {
  return apiRequest(orderDetailSchema, "GET", `/orders/my/${encodeURIComponent(id)}`, {
    scope: "user",
    signal: options.signal,
  });
}

export { queryKeys };

import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import { z } from "zod";
import { STORAGE_KEYS } from "@/api/client";
import type { Product } from "@/api/schemas";

/**
 * Cart state (plan §3 features/cart): Zustand + localStorage persistence.
 * Storage key stays `km_cart` (v1) so persisted carts survive the cutover;
 * the v1 shape — full product objects plus `quantity`, keyed by product id —
 * is parsed leniently and normalized.
 */

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
}

const storedItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.coerce.number().min(0),
  image: z.string().nullable().optional(),
  quantity: z.coerce.number().int().min(1),
});

const storedCartSchema = z.array(storedItemSchema).catch([]);

interface CartState {
  items: CartItem[];
  addItem: (product: Pick<Product, "id" | "name" | "price" | "image">, quantity?: number) => void;
  removeItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
}

export const selectTotalQuantity = (state: CartState): number =>
  state.items.reduce((sum, item) => sum + item.quantity, 0);

export const selectTotalPrice = (state: CartState): number =>
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

type PersistedCart = Pick<CartState, "items">;

const storage: PersistStorage<PersistedCart> = {
  getItem: (name) => {
    try {
      const raw = localStorage.getItem(name);
      if (!raw) return null;
      // v1 stored the bare items array; normalize and repair on load.
      const items = storedCartSchema.parse(JSON.parse(raw)).map((item) => ({
        ...item,
        image: item.image ?? null,
      }));
      return { name, state: { items }, version: 0 };
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    localStorage.setItem(name, JSON.stringify(value.state.items));
  },
  removeItem: (name) => {
    localStorage.removeItem(name);
  },
};

export const useCartStore = create<CartState>()(
  persist<CartState, [], [], PersistedCart>(
    (set) => ({
      items: [],
      addItem: (product, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((item) => item.id === product.id);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item,
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image ?? null,
                quantity,
              },
            ],
          };
        }),
      removeItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
      setQuantity: (id, quantity) =>
        set((state) => ({
          items:
            quantity < 1
              ? state.items.filter((item) => item.id !== id)
              : state.items.map((item) => (item.id === id ? { ...item, quantity } : item)),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: STORAGE_KEYS.cart, storage },
  ),
);

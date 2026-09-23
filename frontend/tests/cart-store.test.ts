import { beforeEach, describe, expect, it } from "vitest";
import { selectTotalPrice, selectTotalQuantity, useCartStore } from "@/features/cart/store";

const product = {
  id: "p1",
  name: "Ноутбук Lenovo ThinkPad T14",
  price: 45990,
  image: null,
};

function resetStore() {
  useCartStore.setState({ items: [] });
}

beforeEach(() => {
  resetStore();
  localStorage.clear();
});

describe("cart store (plan features/cart)", () => {
  it("adds items and increments existing ones", () => {
    const store = useCartStore.getState();
    store.addItem(product);
    store.addItem(product, 2);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]?.quantity).toBe(3);
  });

  it("removes and clears", () => {
    const { addItem, removeItem, clear } = useCartStore.getState();
    addItem(product);
    removeItem("p1");
    expect(useCartStore.getState().items).toHaveLength(0);
    addItem(product);
    clear();
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("removes when quantity drops below 1", () => {
    const { addItem, setQuantity } = useCartStore.getState();
    addItem(product, 1);
    setQuantity("p1", 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("computes totals", () => {
    const { addItem } = useCartStore.getState();
    addItem(product, 2);
    addItem({ id: "p2", name: "Видеокарта RTX 3060", price: 24990, image: null }, 1);
    const state = useCartStore.getState();
    expect(selectTotalQuantity(state)).toBe(3);
    expect(selectTotalPrice(state)).toBe(45990 * 2 + 24990);
  });
});

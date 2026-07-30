"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  getCartItemId,
  type CartItem,
} from "@/lib/cart/types";
import type { DisplaySize } from "@/lib/products/types";

const STORAGE_KEY = "yourbrand-cart";

type AddToCartInput = {
  productSlug: string;
  productName: string;
  size: DisplaySize;
  price: number;
  image: string;
  quantity?: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isCartOpen: boolean;
  addedItem: CartItem | null;
  addItem: (input: AddToCartInput) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  dismissAddedToast: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const EMPTY_CART: CartItem[] = [];

function readStoredItems(): CartItem[] {
  if (typeof window === "undefined") return EMPTY_CART;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_CART;
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : EMPTY_CART;
  } catch {
    return EMPTY_CART;
  }
}

function persistCart(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// --- External store (localStorage-backed cart) -------------------------------
let cartCache: CartItem[] = readStoredItems();
const cartListeners = new Set<() => void>();

function notifyCartListeners(): void {
  for (const cb of cartListeners) cb();
}

function subscribeCart(callback: () => void): () => void {
  cartListeners.add(callback);
  return () => {
    cartListeners.delete(callback);
  };
}

function getCartSnapshot(): CartItem[] {
  return cartCache;
}

function getCartServerSnapshot(): CartItem[] {
  return EMPTY_CART;
}

function mutateCart(updater: (prev: CartItem[]) => CartItem[]): void {
  cartCache = updater(cartCache);
  persistCart(cartCache);
  notifyCartListeners();
}

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(
    subscribeCart,
    getCartSnapshot,
    getCartServerSnapshot,
  );
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [addedItem, setAddedItem] = useState<CartItem | null>(null);

  const addItem = useCallback((input: AddToCartInput) => {
    const qty = input.quantity ?? 1;
    const id = getCartItemId(input.productSlug, input.size);
    const existing = cartCache.find((item) => item.id === id);

    if (existing) {
      const updatedItem = {
        ...existing,
        quantity: Math.min(existing.quantity + qty, 10),
      };
      mutateCart((prev) =>
        prev.map((item) => (item.id === id ? updatedItem : item)),
      );
      setAddedItem(updatedItem);
      return;
    }

    const next: CartItem = {
      id,
      productSlug: input.productSlug,
      productName: input.productName,
      size: input.size,
      quantity: qty,
      price: input.price,
      image: input.image,
    };
    mutateCart((prev) => [...prev, next]);
    setAddedItem(next);
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity < 1) {
      mutateCart((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    mutateCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.min(quantity, 10) } : item,
      ),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    mutateCart((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    mutateCart(() => []);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      ),
      isCartOpen,
      addedItem,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      openCart: () => setIsCartOpen(true),
      closeCart: () => setIsCartOpen(false),
      dismissAddedToast: () => setAddedItem(null),
    }),
    [
      items,
      isCartOpen,
      addedItem,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
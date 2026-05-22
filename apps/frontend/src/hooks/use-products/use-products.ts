"use client";

import { useCallback } from "react";
import { useImmer } from "use-immer";
import useApi from "@/hooks/use-api";

import type { Product } from "shared-types";
import type { UseProductsState } from "./types";

export default function useProducts() {
  const api = useApi();
  const [state, setState] = useImmer<UseProductsState>({
    products: [],
    loading: false,
    error: null,
  });

  const fetchProducts = useCallback(async () => {
    setState((draft) => {
      draft.loading = true;
      draft.error = null;
    });

    try {
      const response = await api.get("products").json<{ data: Product[] }>();
      setState((draft) => {
        draft.products = response.data;
        draft.loading = false;
      });
    } catch (err) {
      setState((draft) => {
        draft.error = err instanceof Error ? err.message : "Failed to fetch products";
        draft.loading = false;
      });
    }
  }, [api, setState]);

  return {
    products: state.products,
    loading: state.loading,
    error: state.error,
    fetchProducts,
  };
}

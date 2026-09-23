import { useEffect, useState } from "react";

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) return initialValue;
      const parsed = JSON.parse(stored);
      return Array.isArray(initialValue) && !Array.isArray(parsed) ? initialValue : parsed;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage no disponible; el carrito solo vive en memoria
    }
  }, [key, value]);

  return [value, setValue];
}

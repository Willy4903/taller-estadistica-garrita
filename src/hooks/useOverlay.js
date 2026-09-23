import { useEffect } from "react";

let abiertos = 0;

export function useOverlay(abierto, onCerrar) {
  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", alPresionar);
    abiertos += 1;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", alPresionar);
      abiertos -= 1;
      if (abiertos === 0) document.body.style.overflow = "";
    };
  }, [abierto, onCerrar]);
}

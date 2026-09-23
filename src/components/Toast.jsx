import { useEffect } from "react";
import { IconoCheck, IconoCerrar } from "./icons";

export default function Toast({ aviso, onCerrar }) {
  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(onCerrar, 3000);
    return () => clearTimeout(id);
  }, [aviso, onCerrar]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4" aria-live="polite">
      {aviso && (
        <div
          key={aviso.id}
          className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-lg px-4 py-3 text-sm shadow-xl ${
            aviso.tipo === "error" ? "bg-red-700 text-white" : "bg-navy text-white"
          }`}
        >
          {aviso.tipo === "error" ? (
            <IconoCerrar className="h-5 w-5 shrink-0" />
          ) : (
            <IconoCheck className="h-5 w-5 shrink-0 text-gold" />
          )}
          <span className="flex-1">{aviso.texto}</span>
          {aviso.accion && (
            <button type="button" onClick={aviso.accion.onClick} className="font-semibold text-gold hover:underline">
              {aviso.accion.texto}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

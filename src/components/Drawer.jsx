import { useOverlay } from "../hooks/useOverlay";
import { IconoCerrar } from "./icons";

export default function Drawer({ abierto, onCerrar, titulo, lado = "derecha", pie, children }) {
  useOverlay(abierto, onCerrar);
  const derecha = lado === "derecha";

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${abierto ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onCerrar}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        inert={!abierto}
        className={`fixed top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ${
          derecha ? "right-0" : "left-0"
        } ${abierto ? "translate-x-0" : derecha ? "translate-x-full" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between bg-navy px-4 py-4">
          <h2 className="text-lg font-bold text-gold">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-full p-1 text-gold hover:bg-white/10"
            aria-label={`Cerrar ${titulo.toLowerCase()}`}
          >
            <IconoCerrar />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
        {pie && <div className="border-t border-gray-200 p-4">{pie}</div>}
      </aside>
    </>
  );
}

import { formatearPrecio } from "../lib/catalogo";
import Drawer from "./Drawer";
import { IconoBasura, IconoCarrito } from "./icons";
import ProductImage from "./ProductImage";

function BotonCantidad({ children, ...props }) {
  return (
    <button
      type="button"
      className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-navy hover:bg-gray-100 disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  );
}

export default function CartDrawer({ abierto, onCerrar, items, onQuitar, onCambiarCantidad, onVaciar, total, cantidadTotal }) {
  const pie = items.length > 0 && (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-lg font-bold text-navy">
        <span>
          Total{" "}
          <span className="text-sm font-normal text-gray-500">
            ({cantidadTotal} {cantidadTotal === 1 ? "artículo" : "artículos"})
          </span>
        </span>
        <span>{formatearPrecio(total)}</span>
      </div>
      <button
        type="button"
        onClick={onVaciar}
        className="w-full rounded-lg border border-navy py-2 text-sm font-semibold text-navy hover:bg-navy/5"
      >
        Vaciar carrito
      </button>
    </div>
  );

  return (
    <Drawer abierto={abierto} onCerrar={onCerrar} titulo="Tu carrito" pie={pie}>
      {items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center text-gray-500">
          <IconoCarrito className="h-12 w-12 text-gray-300" strokeWidth={1.5} />
          <p>Tu carrito está vacío.</p>
          <button type="button" onClick={onCerrar} className="text-sm font-semibold text-navy underline decoration-gold decoration-2 underline-offset-4">
            Seguir comprando
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 rounded-lg border border-gray-200 p-2">
              <ProductImage producto={item} className="h-20 w-20 flex-shrink-0 rounded-md" />
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy">{item.nombre}</p>
                    <p className="text-xs capitalize text-gray-500">
                      Talla {Array.isArray(item.talla) ? item.talla.join(", ") : item.talla} · {item.color}
                    </p>
                    <p className="text-xs text-gray-500">{formatearPrecio(item.precio)} c/u</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onQuitar(item.id)}
                    className="text-gray-400 hover:text-red-600"
                    aria-label={`Quitar ${item.nombre}`}
                  >
                    <IconoBasura className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BotonCantidad onClick={() => onCambiarCantidad(item.id, item.cantidad - 1)} aria-label="Disminuir cantidad">
                      −
                    </BotonCantidad>
                    <span className="w-6 text-center text-sm font-medium" aria-live="polite">
                      {item.cantidad}
                    </span>
                    <BotonCantidad onClick={() => onCambiarCantidad(item.id, item.cantidad + 1)} aria-label="Aumentar cantidad">
                      +
                    </BotonCantidad>
                  </div>
                  <span className="text-sm font-bold text-navy">{formatearPrecio(item.precio * item.cantidad)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}

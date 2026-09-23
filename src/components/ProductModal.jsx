import { useOverlay } from "../hooks/useOverlay";
import { capitalizar, formatearPrecio } from "../lib/catalogo";
import { IconoCerrar } from "./icons";
import ProductImage from "./ProductImage";

export default function ProductModal({ producto, onCerrar, onAgregar }) {
  useOverlay(Boolean(producto), onCerrar);
  if (!producto) return null;

  const detalles = [
    ["Categoría", capitalizar(producto.categoria)],
    ["Género", capitalizar(producto.genero)],
    ["Talla", Array.isArray(producto.talla) ? producto.talla.join(", ") : producto.talla],
    ["Color", capitalizar(producto.color)],
    ["Material", capitalizar(producto.material)],
  ].filter(([, valor]) => valor);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        onClick={(e) => e.stopPropagation()}
        className="relative grid max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:grid-cols-2 sm:rounded-2xl"
      >
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar detalle"
          className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-1.5 text-navy shadow hover:bg-white"
        >
          <IconoCerrar />
        </button>

        <ProductImage key={producto.id} producto={producto} className="aspect-square w-full bg-gray-100 sm:h-full" />

        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div>
            <h2 id="modal-titulo" className="text-xl font-bold text-navy">{producto.nombre}</h2>
            <p className="mt-1 text-2xl font-extrabold text-navy">{formatearPrecio(producto.precio)}</p>
          </div>

          {producto.descripcion && <p className="text-sm leading-relaxed text-gray-600">{producto.descripcion}</p>}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-gray-50 p-3 text-sm">
            {detalles.map(([etiqueta, valor]) => (
              <div key={etiqueta}>
                <dt className="text-xs uppercase tracking-wide text-gray-500">{etiqueta}</dt>
                <dd className="font-medium text-navy">{valor}</dd>
              </div>
            ))}
          </dl>

          <button
            type="button"
            onClick={() => {
              onAgregar(producto);
              onCerrar();
            }}
            className="mt-auto rounded-lg bg-navy py-3 font-semibold text-gold transition-colors hover:bg-navy-light"
          >
            Agregar al carrito
          </button>
        </div>
      </div>
    </div>
  );
}

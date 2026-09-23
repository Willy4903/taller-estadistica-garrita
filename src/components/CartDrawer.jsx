export default function CartDrawer({ abierto, onCerrar, items, onQuitar, onCambiarCantidad, onVaciar, total }) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          abierto ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onCerrar}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ${
          abierto ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 bg-navy px-4 py-4">
          <h2 className="text-lg font-bold text-gold">Tu carrito</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-full p-1 text-gold hover:bg-white/10"
            aria-label="Cerrar carrito"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <p className="mt-10 text-center text-gray-500">Tu carrito está vacío.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-3 rounded-lg border border-gray-200 p-2"
                >
                  <img
                    src={item.imagen}
                    alt={item.nombre}
                    className="h-16 w-16 flex-shrink-0 rounded-md object-cover"
                  />
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <p className="text-sm font-semibold text-navy">{item.nombre}</p>
                      <p className="text-xs text-gray-500">
                        Talla {item.talla} · {item.color}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onCambiarCantidad(item.id, item.cantidad - 1)}
                          className="h-6 w-6 rounded-full border border-gray-300 text-sm text-navy hover:bg-gray-100"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-sm">{item.cantidad}</span>
                        <button
                          type="button"
                          onClick={() => onCambiarCantidad(item.id, item.cantidad + 1)}
                          className="h-6 w-6 rounded-full border border-gray-300 text-sm text-navy hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-bold text-navy">
                        S/ {(item.precio * item.cantidad).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onQuitar(item.id)}
                    className="self-start text-gray-400 hover:text-red-500"
                    aria-label={`Quitar ${item.nombre}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="space-y-3 border-t border-gray-200 p-4">
            <div className="flex items-center justify-between text-lg font-bold text-navy">
              <span>Total</span>
              <span>S/ {total.toFixed(2)}</span>
            </div>
            <button
              type="button"
              onClick={onVaciar}
              className="w-full rounded-lg border border-navy py-2 text-sm font-semibold text-navy hover:bg-navy/5"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

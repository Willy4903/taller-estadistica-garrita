import { capitalizar } from "../lib/catalogo";
import { IconoCheck } from "./icons";

const MUESTRAS = {
  blanco: "#ffffff",
  negro: "#111827",
  azul: "#1d4ed8",
  gris: "#9ca3af",
  marrón: "#7c4a24",
  dorado: "#d4af37",
  rosado: "#f9a8d4",
  rojo: "#dc2626",
  verde: "#16a34a",
  amarillo: "#facc15",
  beige: "#e8d9b5",
  morado: "#7e22ce",
  naranja: "#f97316",
};

function Opcion({ activa, deshabilitada, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      disabled={deshabilitada}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
        activa
          ? "border-navy bg-navy text-gold shadow-sm"
          : "border-gray-300 bg-white text-navy hover:border-navy/50 hover:bg-navy/5"
      } disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-300 disabled:hover:bg-white`}
    >
      {children}
    </button>
  );
}

function Grupo({ titulo, campo, opciones, seleccion, conteos, onToggle, etiqueta = capitalizar, muestras = false }) {
  return (
    <fieldset>
      <legend className="mb-2 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-navy/70">
        {titulo}
        {seleccion.length > 0 && (
          <span className="rounded-full bg-gold px-1.5 text-[10px] text-navy">{seleccion.length}</span>
        )}
      </legend>
      <div className="flex flex-wrap gap-2">
        {opciones.map((opcion) => {
          const activa = seleccion.includes(opcion);
          const total = conteos[opcion] ?? 0;
          return (
            <Opcion
              key={opcion}
              activa={activa}
              deshabilitada={!activa && total === 0}
              onClick={() => onToggle(campo, opcion)}
            >
              {muestras && (
                <span
                  className="h-3.5 w-3.5 rounded-full border border-gray-300"
                  style={{ backgroundColor: MUESTRAS[opcion] ?? "#e5e7eb" }}
                />
              )}
              {activa && !muestras && <IconoCheck className="h-3.5 w-3.5" strokeWidth={3} />}
              {etiqueta(opcion)}
              <span className={`text-xs ${activa ? "text-gold/70" : "text-gray-400"}`}>{total}</span>
            </Opcion>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function FiltersPanel({ grupos, filtros, conteos, onToggle, onLimpiar, filtrosActivos, conTitulo = true }) {
  return (
    <div className="space-y-5">
      <div className={`flex items-center ${conTitulo ? "justify-between" : "justify-end"}`}>
        {conTitulo && <h2 className="text-base font-bold text-navy">Filtros</h2>}
        {filtrosActivos > 0 && (
          <button
            type="button"
            onClick={onLimpiar}
            className="text-sm font-medium text-navy/70 underline decoration-gold decoration-2 underline-offset-4 hover:text-navy"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {grupos.map((grupo) => (
        <Grupo
          key={grupo.campo}
          {...grupo}
          seleccion={filtros[grupo.campo]}
          conteos={conteos[grupo.campo]}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

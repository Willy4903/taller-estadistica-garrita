const GENEROS = ["hombre", "mujer", "niño"];
const TALLAS = ["XS", "S", "M", "L", "XL", "XXL"];
const CATEGORIAS = ["camisetas", "pantalones", "zapatos", "accesorios", "otro"];

function FilterGroup({ title, options, selected, onToggle, capitalize = true }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-navy/70">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = selected === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(isActive ? "" : option)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                capitalize ? "capitalize" : ""
              } ${
                isActive
                  ? "border-gold bg-navy text-gold shadow-sm"
                  : "border-gray-300 bg-white text-navy hover:border-navy/50 hover:bg-navy/5"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function FiltersPanel({ filtros, setFiltros, colores, onClear, hayFiltrosActivos }) {
  const actualizarFiltro = (campo, valor) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  };

  return (
    <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-navy">Filtros</h2>
        {hayFiltrosActivos && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm font-medium text-navy/70 underline decoration-gold decoration-2 underline-offset-2 hover:text-navy"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <FilterGroup
        title="Género"
        options={GENEROS}
        selected={filtros.genero}
        onToggle={(v) => actualizarFiltro("genero", v)}
      />
      <FilterGroup
        title="Talla"
        options={TALLAS}
        selected={filtros.talla}
        onToggle={(v) => actualizarFiltro("talla", v)}
        capitalize={false}
      />
      <FilterGroup
        title="Categoría"
        options={CATEGORIAS}
        selected={filtros.categoria}
        onToggle={(v) => actualizarFiltro("categoria", v)}
      />
      {colores.length > 0 && (
        <FilterGroup
          title="Color"
          options={colores}
          selected={filtros.color}
          onToggle={(v) => actualizarFiltro("color", v)}
        />
      )}
    </div>
  );
}

export { GENEROS, TALLAS, CATEGORIAS };

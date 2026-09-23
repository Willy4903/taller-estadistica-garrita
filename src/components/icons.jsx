function Icono({ children, className = "h-5 w-5", strokeWidth = 2 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconoCarrito = (p) => (
  <Icono {...p}>
    <circle cx="9" cy="20" r="1.5" />
    <circle cx="18" cy="20" r="1.5" />
    <path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.5L21 8H6" />
  </Icono>
);

export const IconoCerrar = (p) => (
  <Icono {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Icono>
);

export const IconoBuscar = (p) => (
  <Icono {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icono>
);

export const IconoFiltro = (p) => (
  <Icono {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Icono>
);

export const IconoSubir = (p) => (
  <Icono {...p}>
    <path d="M12 16V4m0 0-4 4m4-4 4 4M4 20h16" />
  </Icono>
);

export const IconoBasura = (p) => (
  <Icono {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </Icono>
);

export const IconoCheck = (p) => (
  <Icono {...p}>
    <path d="m5 12 5 5L20 7" />
  </Icono>
);

const SILUETAS = {
  camisetas: <path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3a3 3 0 0 1-8 0Z" />,
  pantalones: <path d="M6 3h12l1 18h-5l-2-11-2 11H5L6 3Z" />,
  zapatos: <path d="M3 17v-5l4-1 3-5 3 3 5 2a3 3 0 0 1 3 3v3Zm0 0h18v2H3Z" />,
  accesorios: <path d="M6 8h12l1 13H5L6 8Zm3 0V6a3 3 0 0 1 6 0v2" />,
  otro: <path d="M3 12V4h8l10 10-7 7L3 12Zm5-4h.01" />,
};

export const SiluetaCategoria = ({ categoria, ...p }) => (
  <Icono strokeWidth={1.2} {...p}>
    {SILUETAS[categoria] ?? SILUETAS.otro}
  </Icono>
);

import { useState } from "react";
import { SiluetaCategoria } from "./icons";

export default function ProductImage({ producto, className = "" }) {
  const [fallo, setFallo] = useState(false);

  if (!producto.imagen || fallo) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-navy to-navy-light ${className}`}
        role="img"
        aria-label={producto.nombre}
      >
        <SiluetaCategoria categoria={producto.categoria} className="h-1/2 w-1/2 text-gold/80" />
      </div>
    );
  }

  return (
    <img
      src={producto.imagen}
      alt={producto.nombre}
      loading="lazy"
      onError={() => setFallo(true)}
      className={`object-cover ${className}`}
    />
  );
}

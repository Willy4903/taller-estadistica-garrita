import { useCallback, useEffect, useState } from "react";
import { validarCatalogo } from "../lib/catalogo";

const RETARDO_SIMULADO_MS = 600;

async function descargarCatalogo(url) {
  const [respuesta] = await Promise.all([
    fetch(url),
    new Promise((resolver) => setTimeout(resolver, RETARDO_SIMULADO_MS)),
  ]);
  if (!respuesta.ok) throw new Error(`No se pudo cargar el catálogo (HTTP ${respuesta.status}).`);
  return validarCatalogo(await respuesta.json());
}

export function useCatalogo(url) {
  const [estado, setEstado] = useState({ productos: [], cargando: true, error: "", origen: "" });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    descargarCatalogo(url).then(
      (productos) => vigente && setEstado({ productos, cargando: false, error: "", origen: "Catálogo de ejemplo" }),
      (e) => vigente && setEstado((prev) => ({ ...prev, cargando: false, error: e.message }))
    );
    return () => {
      vigente = false;
    };
  }, [url, intento]);

  const recargar = useCallback(() => {
    setEstado((prev) => ({ ...prev, cargando: true, error: "" }));
    setIntento((n) => n + 1);
  }, []);

  const importarArchivo = useCallback(async (archivo) => {
    let json;
    try {
      json = JSON.parse(await archivo.text());
    } catch {
      throw new Error("El archivo no contiene un JSON válido.");
    }
    const productos = validarCatalogo(json);
    setEstado({ productos, cargando: false, error: "", origen: archivo.name });
    return productos.length;
  }, []);

  return { ...estado, recargar, importarArchivo };
}

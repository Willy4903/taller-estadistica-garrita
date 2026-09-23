import { describe, expect, it } from "vitest";
import {
  FILTROS_VACIOS,
  contarOpciones,
  escribirEstadoEnUrl,
  filtrarProductos,
  leerEstadoDeUrl,
  ordenarProductos,
  validarCatalogo,
} from "./catalogo";

const productos = [
  { id: 1, nombre: "Polo Clásico", categoria: "camisetas", genero: "hombre", talla: "M", color: "blanco", precio: 90 },
  { id: 2, nombre: "Zapatillas Niño", categoria: "zapatos", genero: "niño", talla: "XS", color: "azul", precio: 60 },
  { id: 3, nombre: "Vestido", categoria: "otro", genero: "mujer", talla: ["S", "M"], color: "blanco", precio: 120 },
];

const filtros = (parcial) => ({ ...FILTROS_VACIOS, ...parcial });

describe("filtrarProductos", () => {
  it("sin criterios devuelve todo", () => {
    expect(filtrarProductos(productos, FILTROS_VACIOS)).toHaveLength(3);
  });

  it("combina valores de un mismo filtro con O y entre filtros con Y", () => {
    const r = filtrarProductos(productos, filtros({ genero: ["hombre", "mujer"], color: ["blanco"] }));
    expect(r.map((p) => p.id)).toEqual([1, 3]);
    expect(filtrarProductos(productos, filtros({ genero: ["niño"], color: ["blanco"] }))).toHaveLength(0);
  });

  it("acepta tallas como arreglo", () => {
    expect(filtrarProductos(productos, filtros({ talla: ["S"] })).map((p) => p.id)).toEqual([3]);
  });

  it("busca sin distinguir tildes ni mayúsculas", () => {
    expect(filtrarProductos(productos, FILTROS_VACIOS, "clasico")[0].id).toBe(1);
    expect(filtrarProductos(productos, FILTROS_VACIOS, "  NINO ")[0].id).toBe(2);
  });
});

describe("ordenarProductos", () => {
  it("ordena por precio y nombre sin mutar el original", () => {
    expect(ordenarProductos(productos, "precio-asc").map((p) => p.id)).toEqual([2, 1, 3]);
    expect(ordenarProductos(productos, "precio-desc").map((p) => p.id)).toEqual([3, 1, 2]);
    expect(ordenarProductos(productos, "nombre-asc").map((p) => p.id)).toEqual([1, 3, 2]);
    expect(productos.map((p) => p.id)).toEqual([1, 2, 3]);
  });
});

describe("contarOpciones", () => {
  it("ignora el propio filtro del grupo al contar", () => {
    const conteo = contarOpciones(productos, filtros({ genero: ["hombre"], color: ["blanco"] }), "", "genero", [
      "hombre",
      "mujer",
      "niño",
    ]);
    expect(conteo).toEqual({ hombre: 1, mujer: 1, niño: 0 });
  });
});

describe("validarCatalogo", () => {
  it("normaliza y acepta el formato { productos: [...] }", () => {
    const [p] = validarCatalogo({
      productos: [{ id: 7, nombre: "Gorra", categoria: "Accesorios", genero: "Hombre", color: "Negro", talla: "M", precio: "24.5" }],
    });
    expect(p).toMatchObject({ id: 7, categoria: "accesorios", genero: "hombre", color: "negro", precio: 24.5 });
  });

  it("rechaza datos inválidos con un mensaje claro", () => {
    expect(() => validarCatalogo({})).toThrow(/productos/);
    expect(() => validarCatalogo({ productos: [{ nombre: "X" }] })).toThrow(/categoria/);
    const base = { nombre: "X", categoria: "otro", genero: "mujer", color: "rojo" };
    expect(() => validarCatalogo({ productos: [{ ...base, precio: "abc" }] })).toThrow(/precio/);
    expect(() => validarCatalogo({ productos: [{ ...base, id: 1, precio: 1 }, { ...base, id: 1, precio: 2 }] })).toThrow(/repetido/);
  });
});

describe("estado en URL", () => {
  it("ida y vuelta conserva filtros, búsqueda y orden", () => {
    const estado = { busqueda: "polo", orden: "precio-desc", filtros: filtros({ genero: ["mujer", "niño"], talla: ["M"] }) };
    expect(leerEstadoDeUrl(escribirEstadoEnUrl(estado))).toEqual(estado);
  });

  it("descarta un orden desconocido", () => {
    expect(leerEstadoDeUrl("?orden=toString").orden).toBe("relevancia");
  });
});

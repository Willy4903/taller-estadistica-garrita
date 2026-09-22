"""
Generador de datos SINTETICOS que replican la estructura de la ENAHO 2022
(modulo 34 - Sumaria: gasto/ingreso del hogar, condicion de pobreza; y
modulo 01 - Vivienda y Hogar: caracteristicas de la vivienda), cruzados por
CONGLOME/VIVIENDA/HOGAR.

Por que sintetico: este entorno de ejecucion tiene una lista blanca de
dominios de red y bloquea el acceso a inei.gob.pe y datosabiertos.gob.pe
(403 de politica de egress), por lo que no fue posible descargar el zip
oficial 2022.zip ni la data de muestra. Los nombres de variables, categorias
(dominio geografico, area, material de vivienda, condicion de pobreza) y
rangos de valores se basan en el diccionario de variables ENAHO publicado
por el INEI, y las relaciones entre variables (educacion-ingreso,
urbano/rural-gasto, etc.) buscan ser realistas para fines didacticos.

Para usar datos reales: descarga el modulo 34 (Sumaria) y el modulo 01
(Vivienda) del anio que prefieras desde
https://www.datosabiertos.gob.pe/search/field_tags/enaho-950, crucalos por
CONGLOME + VIVIENDA + HOGAR, y reemplaza los CSV en data/ manteniendo los
mismos nombres de columna que usan train.py y app.py en cada proyecto.
"""

import numpy as np
import pandas as pd

RANDOM_SEED = 42
N_HOGARES = 8000

DOMINIOS = [
    "Costa Norte", "Costa Centro", "Costa Sur",
    "Sierra Norte", "Sierra Centro", "Sierra Sur",
    "Selva", "Lima Metropolitana",
]
# Pesos aproximados de poblacion por dominio (INEI, orden de magnitud)
PESOS_DOMINIO = [0.10, 0.08, 0.06, 0.09, 0.08, 0.09, 0.12, 0.38]

# Probabilidad de area "Rural" por dominio (Lima Metropolitana ~0 rural)
PROB_RURAL_POR_DOMINIO = {
    "Costa Norte": 0.22, "Costa Centro": 0.18, "Costa Sur": 0.20,
    "Sierra Norte": 0.55, "Sierra Centro": 0.50, "Sierra Sur": 0.58,
    "Selva": 0.45, "Lima Metropolitana": 0.01,
}

REGION_POR_DOMINIO = {
    "Costa Norte": "Costa", "Costa Centro": "Costa", "Costa Sur": "Costa",
    "Sierra Norte": "Sierra", "Sierra Centro": "Sierra", "Sierra Sur": "Sierra",
    "Selva": "Selva", "Lima Metropolitana": "Costa",
}

# Linea de pobreza monetaria mensual per capita (S/.), aproximada a la
# metodologia INEI 2022 (mayor costo de vida en zonas urbanas)
LINEA_POBREZA = {"Urbano": 447.0, "Rural": 322.0}


def generar_dataframe(n=N_HOGARES, seed=RANDOM_SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    dominio = rng.choice(DOMINIOS, size=n, p=PESOS_DOMINIO)
    region_natural = np.array([REGION_POR_DOMINIO[d] for d in dominio])
    prob_rural = np.array([PROB_RURAL_POR_DOMINIO[d] for d in dominio])
    area = np.where(rng.random(n) < prob_rural, "Rural", "Urbano")

    miembros_hogar = np.clip(rng.poisson(3.6, size=n) + 1, 1, 9)

    sexo_jefe = np.where(rng.random(n) < 0.30, "Mujer", "Hombre")
    edad_jefe_hogar = np.clip(rng.normal(48, 14, size=n), 18, 90).round().astype(int)

    # Educacion: mayor en zonas urbanas y en Lima, menor en rural/sierra
    base_edu = np.where(area == "Urbano", 11.0, 6.5)
    base_edu = base_edu + np.where(dominio == "Lima Metropolitana", 1.5, 0.0)
    anios_educacion_jefe = np.clip(
        rng.normal(base_edu, 3.2, size=n), 0, 18
    ).round().astype(int)

    condicion_ocupacion_jefe = np.select(
        [edad_jefe_hogar >= 65, rng.random(n) < 0.05],
        ["Inactivo", "Desocupado"],
        default="Ocupado",
    )

    n_habitaciones_vivienda = np.clip(
        rng.poisson(2.6, size=n) + 1
        + (anios_educacion_jefe > 11).astype(int), 1, 8
    )

    material_paredes = np.where(
        area == "Urbano",
        rng.choice(
            ["Ladrillo o Bloque de cemento", "Adobe", "Madera", "Otro material"],
            size=n, p=[0.78, 0.10, 0.09, 0.03],
        ),
        rng.choice(
            ["Ladrillo o Bloque de cemento", "Adobe", "Madera", "Otro material"],
            size=n, p=[0.25, 0.45, 0.22, 0.08],
        ),
    )

    abastecimiento_agua = np.where(
        area == "Urbano",
        rng.choice(
            ["Red publica dentro de la vivienda", "Red publica fuera de la vivienda",
             "Pozo", "Rio, acequia o manantial", "Otro"],
            size=n, p=[0.83, 0.09, 0.03, 0.02, 0.03],
        ),
        rng.choice(
            ["Red publica dentro de la vivienda", "Red publica fuera de la vivienda",
             "Pozo", "Rio, acequia o manantial", "Otro"],
            size=n, p=[0.35, 0.15, 0.20, 0.25, 0.05],
        ),
    )

    perceptores_ingreso = np.clip(
        rng.binomial(np.maximum(miembros_hogar - 1, 1), 0.55) + 1,
        1, miembros_hogar,
    )

    # --- Ingresos por fuente (S/. mensuales del hogar) ---
    factor_urbano = np.where(area == "Urbano", 1.0, 0.62)
    factor_region = np.where(dominio == "Lima Metropolitana", 1.35, 1.0)
    factor_educacion = 1 + 0.055 * anios_educacion_jefe
    factor_ocupacion = np.where(condicion_ocupacion_jefe == "Ocupado", 1.0,
                                 np.where(condicion_ocupacion_jefe == "Inactivo", 0.35, 0.15))

    media_trabajo = (
        1450 * factor_urbano * factor_region * factor_educacion * factor_ocupacion
        * (0.55 + 0.35 * perceptores_ingreso)
    )
    ingreso_trabajo_principal = np.clip(
        rng.lognormal(mean=np.log(np.maximum(media_trabajo, 150)), sigma=0.45), 0, None
    ).round(2)

    ingreso_independiente = np.where(
        rng.random(n) < 0.35,
        np.clip(rng.lognormal(mean=np.log(750 * factor_urbano), sigma=0.6, size=n), 0, None),
        0.0,
    ).round(2)

    prob_transferencia = np.where(area == "Rural", 0.55, 0.25)
    ingreso_transferencias_publicas = np.where(
        rng.random(n) < prob_transferencia,
        np.clip(rng.normal(180, 60, size=n), 30, None),
        0.0,
    ).round(2)

    ingreso_extraordinario = np.where(
        rng.random(n) < 0.12,
        np.clip(rng.lognormal(mean=np.log(150), sigma=0.8, size=n), 0, None),
        0.0,
    ).round(2)

    ingreso_total_hogar = (
        ingreso_trabajo_principal + ingreso_independiente
        + ingreso_transferencias_publicas + ingreso_extraordinario
    )

    # --- Gasto del hogar: propension a consumir <1, con ruido y piso minimo ---
    propension_consumo = np.clip(rng.normal(0.82, 0.08, size=n), 0.5, 1.05)
    ruido_gasto = rng.normal(1.0, 0.12, size=n)
    gasto_total_hogar = np.clip(
        ingreso_total_hogar * propension_consumo * ruido_gasto
        + rng.normal(0, 40, size=n),
        80, None,
    )

    gasto_percapita_mensual = (gasto_total_hogar / miembros_hogar).round(2)
    ingreso_percapita_mensual = (ingreso_total_hogar / miembros_hogar).round(2)

    linea = np.where(area == "Urbano", LINEA_POBREZA["Urbano"], LINEA_POBREZA["Rural"])
    # separacion suave: probabilidad logistica alrededor de la linea de pobreza
    z = (linea - gasto_percapita_mensual) / (0.18 * linea)
    prob_pobre = 1 / (1 + np.exp(-z))
    pobre = (rng.random(n) < prob_pobre).astype(int)

    dependencia_economica = (miembros_hogar / perceptores_ingreso).round(2)

    df = pd.DataFrame({
        "conglome": [f"{i:06d}" for i in range(1, n + 1)],
        "vivienda": rng.integers(1, 20, size=n),
        "hogar": 1,
        "dominio_geografico": dominio,
        "region_natural": region_natural,
        "area": area,
        "miembros_hogar": miembros_hogar,
        "perceptores_ingreso": perceptores_ingreso,
        "dependencia_economica": dependencia_economica,
        "sexo_jefe_hogar": sexo_jefe,
        "edad_jefe_hogar": edad_jefe_hogar,
        "anios_educacion_jefe": anios_educacion_jefe,
        "condicion_ocupacion_jefe": condicion_ocupacion_jefe,
        "n_habitaciones_vivienda": n_habitaciones_vivienda,
        "material_paredes": material_paredes,
        "abastecimiento_agua": abastecimiento_agua,
        "ingreso_trabajo_principal": ingreso_trabajo_principal,
        "ingreso_independiente": ingreso_independiente,
        "ingreso_transferencias_publicas": ingreso_transferencias_publicas,
        "ingreso_extraordinario": ingreso_extraordinario,
        "ingreso_percapita_mensual": ingreso_percapita_mensual,
        "gasto_percapita_mensual": gasto_percapita_mensual,
        "pobre": pobre,
    })

    # Nulos aleatorios (~3%) en algunas columnas, para ejercitar el imputer
    for col, frac in [
        ("anios_educacion_jefe", 0.03), ("n_habitaciones_vivienda", 0.02),
        ("ingreso_independiente", 0.04), ("material_paredes", 0.02),
        ("abastecimiento_agua", 0.02), ("edad_jefe_hogar", 0.015),
    ]:
        mask = rng.random(n) < frac
        df.loc[mask, col] = np.nan

    return df


if __name__ == "__main__":
    df = generar_dataframe()

    cols_regresion = [
        "conglome", "vivienda", "hogar",
        "area", "dominio_geografico", "region_natural",
        "material_paredes", "abastecimiento_agua",
        "miembros_hogar", "perceptores_ingreso", "edad_jefe_hogar",
        "anios_educacion_jefe", "n_habitaciones_vivienda",
        "ingreso_trabajo_principal", "ingreso_independiente",
        "ingreso_transferencias_publicas", "ingreso_extraordinario",
        "gasto_percapita_mensual",
    ]
    df[cols_regresion].to_csv(
        "proyecto1_regresion/data/enaho_2022_sumaria_regresion.csv", index=False
    )

    cols_clasificacion = [
        "conglome", "vivienda", "hogar",
        "area", "dominio_geografico",
        "material_paredes", "abastecimiento_agua",
        "sexo_jefe_hogar", "condicion_ocupacion_jefe",
        "miembros_hogar", "perceptores_ingreso", "dependencia_economica",
        "edad_jefe_hogar", "anios_educacion_jefe", "n_habitaciones_vivienda",
        "pobre",
    ]
    df[cols_clasificacion].to_csv(
        "proyecto2_clasificacion/data/enaho_2022_sumaria_clasificacion.csv", index=False
    )

    print("Regresion:", df[cols_regresion].shape)
    print("Clasificacion:", df[cols_clasificacion].shape)
    print(df["pobre"].value_counts(normalize=True))

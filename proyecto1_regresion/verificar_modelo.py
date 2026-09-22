"""
Carga el pipeline entrenado y predice un caso fijo. El resultado debe
coincidir exactamente con el que muestra app.py al ingresar los mismos
valores en el sidebar (misma fila, mismo pipeline .pkl).
"""

import joblib
import pandas as pd

MODEL_PATH = "modelo_regresion_gasto.pkl"

CASO_FIJO = {
    "area": "Urbano",
    "dominio_geografico": "Lima Metropolitana",
    "region_natural": "Costa",
    "material_paredes": "Ladrillo o Bloque de cemento",
    "abastecimiento_agua": "Red publica dentro de la vivienda",
    "miembros_hogar": 4,
    "perceptores_ingreso": 2,
    "edad_jefe_hogar": 45,
    "anios_educacion_jefe": 12,
    "n_habitaciones_vivienda": 4,
    "ingreso_trabajo_principal": 2200.0,
    "ingreso_independiente": 300.0,
    "ingreso_transferencias_publicas": 0.0,
    "ingreso_extraordinario": 0.0,
}

if __name__ == "__main__":
    pipeline = joblib.load(MODEL_PATH)
    fila = pd.DataFrame([CASO_FIJO])
    prediccion = pipeline.predict(fila)[0]

    print("Caso de entrada:")
    for k, v in CASO_FIJO.items():
        print(f"  {k}: {v}")
    print(f"\nGasto per capita mensual predicho: S/ {prediccion:.2f}")

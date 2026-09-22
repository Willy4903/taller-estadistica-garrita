"""
Carga el pipeline entrenado y predice un caso fijo. El resultado debe
coincidir exactamente con el que muestra app.py al ingresar los mismos
valores en el sidebar (misma fila, mismo pipeline .pkl).
"""

import joblib
import pandas as pd

MODEL_PATH = "modelo_clasificacion_pobreza.pkl"

CASO_FIJO = {
    "area": "Rural",
    "dominio_geografico": "Sierra Sur",
    "material_paredes": "Adobe",
    "abastecimiento_agua": "Pozo",
    "sexo_jefe_hogar": "Hombre",
    "condicion_ocupacion_jefe": "Ocupado",
    "miembros_hogar": 5,
    "perceptores_ingreso": 1,
    "dependencia_economica": 5.0,
    "edad_jefe_hogar": 40,
    "anios_educacion_jefe": 5,
    "n_habitaciones_vivienda": 2,
}

if __name__ == "__main__":
    pipeline = joblib.load(MODEL_PATH)
    fila = pd.DataFrame([CASO_FIJO])
    clase = pipeline.predict(fila)[0]
    proba_pobre = pipeline.predict_proba(fila)[0, 1]

    print("Caso de entrada:")
    for k, v in CASO_FIJO.items():
        print(f"  {k}: {v}")

    etiqueta = "Pobre" if clase == 1 else "No pobre"
    print(f"\nClase predicha: {clase} ({etiqueta})")
    print(f"Probabilidad de pobreza: {proba_pobre:.4f}")

"""
Streamlit app - Proyecto 1: prediccion del gasto per capita mensual del
hogar (ENAHO 2022, datos sinteticos con estructura ENAHO - ver data/).
"""

import joblib
import pandas as pd
import streamlit as st

MODEL_PATH = "modelo_regresion_gasto.pkl"

DOMINIOS = [
    "Costa Norte", "Costa Centro", "Costa Sur",
    "Sierra Norte", "Sierra Centro", "Sierra Sur",
    "Selva", "Lima Metropolitana",
]
REGIONES = ["Costa", "Sierra", "Selva"]
MATERIALES = ["Ladrillo o Bloque de cemento", "Adobe", "Madera", "Otro material"]
FUENTES_AGUA = [
    "Red publica dentro de la vivienda", "Red publica fuera de la vivienda",
    "Pozo", "Rio, acequia o manantial", "Otro",
]


@st.cache_resource
def cargar_modelo():
    return joblib.load(MODEL_PATH)


def main():
    st.set_page_config(page_title="ENAHO - Gasto per capita", page_icon="📊")
    st.title("Prediccion del gasto per capita mensual del hogar")
    st.caption(
        "Proyecto 1 - Regresion (ENAHO 2022, modulo 34 Sumaria + modulo 01 Vivienda). "
        "Datos de entrenamiento sinteticos con estructura ENAHO (ver README)."
    )

    st.sidebar.header("Caracteristicas del hogar")

    area = st.sidebar.selectbox("Area de residencia", ["Urbano", "Rural"])
    dominio_geografico = st.sidebar.selectbox("Dominio geografico", DOMINIOS)
    region_natural = st.sidebar.selectbox("Region natural", REGIONES)
    material_paredes = st.sidebar.selectbox("Material predominante de paredes", MATERIALES)
    abastecimiento_agua = st.sidebar.selectbox("Abastecimiento de agua", FUENTES_AGUA)

    miembros_hogar = st.sidebar.slider("Miembros del hogar", 1, 9, 4)
    perceptores_ingreso = st.sidebar.slider(
        "Perceptores de ingreso", 1, miembros_hogar, min(2, miembros_hogar)
    )
    edad_jefe_hogar = st.sidebar.slider("Edad del jefe de hogar", 18, 90, 45)
    anios_educacion_jefe = st.sidebar.slider("Anios de educacion del jefe de hogar", 0, 18, 12)
    n_habitaciones_vivienda = st.sidebar.slider("Numero de habitaciones de la vivienda", 1, 8, 4)

    ingreso_trabajo_principal = st.sidebar.slider(
        "Ingreso mensual por trabajo principal (S/.)", 0, 15000, 2200, step=50
    )
    ingreso_independiente = st.sidebar.slider(
        "Ingreso mensual independiente (S/.)", 0, 8000, 300, step=50
    )
    ingreso_transferencias_publicas = st.sidebar.slider(
        "Ingreso mensual por transferencias publicas (S/.)", 0, 1000, 0, step=10
    )
    ingreso_extraordinario = st.sidebar.slider(
        "Ingreso extraordinario mensual (S/.)", 0, 3000, 0, step=50
    )

    entrada = pd.DataFrame([{
        "area": area,
        "dominio_geografico": dominio_geografico,
        "region_natural": region_natural,
        "material_paredes": material_paredes,
        "abastecimiento_agua": abastecimiento_agua,
        "miembros_hogar": miembros_hogar,
        "perceptores_ingreso": perceptores_ingreso,
        "edad_jefe_hogar": edad_jefe_hogar,
        "anios_educacion_jefe": anios_educacion_jefe,
        "n_habitaciones_vivienda": n_habitaciones_vivienda,
        "ingreso_trabajo_principal": float(ingreso_trabajo_principal),
        "ingreso_independiente": float(ingreso_independiente),
        "ingreso_transferencias_publicas": float(ingreso_transferencias_publicas),
        "ingreso_extraordinario": float(ingreso_extraordinario),
    }])

    st.subheader("Datos ingresados")
    st.dataframe(entrada, use_container_width=True)

    if st.sidebar.button("Predecir gasto per capita"):
        modelo = cargar_modelo()
        prediccion = modelo.predict(entrada)[0]
        st.success(f"Gasto per capita mensual estimado: **S/ {prediccion:.2f}**")


if __name__ == "__main__":
    main()

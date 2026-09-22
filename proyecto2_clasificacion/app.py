"""
Streamlit app - Proyecto 2: prediccion de la condicion de pobreza del
hogar (ENAHO 2022, datos sinteticos con estructura ENAHO - ver data/).
"""

import joblib
import pandas as pd
import streamlit as st

MODEL_PATH = "modelo_clasificacion_pobreza.pkl"

DOMINIOS = [
    "Costa Norte", "Costa Centro", "Costa Sur",
    "Sierra Norte", "Sierra Centro", "Sierra Sur",
    "Selva", "Lima Metropolitana",
]
MATERIALES = ["Ladrillo o Bloque de cemento", "Adobe", "Madera", "Otro material"]
FUENTES_AGUA = [
    "Red publica dentro de la vivienda", "Red publica fuera de la vivienda",
    "Pozo", "Rio, acequia o manantial", "Otro",
]
OCUPACIONES = ["Ocupado", "Desocupado", "Inactivo"]


@st.cache_resource
def cargar_modelo():
    return joblib.load(MODEL_PATH)


def main():
    st.set_page_config(page_title="ENAHO - Condicion de pobreza", page_icon="🏠")
    st.title("Prediccion de la condicion de pobreza del hogar")
    st.caption(
        "Proyecto 2 - Clasificacion (ENAHO 2022, modulo 34 Sumaria). "
        "Target dicotomico: 1 = pobre, 0 = no pobre. "
        "Datos de entrenamiento sinteticos con estructura ENAHO (ver README)."
    )

    st.sidebar.header("Caracteristicas del hogar")

    area = st.sidebar.selectbox("Area de residencia", ["Urbano", "Rural"])
    dominio_geografico = st.sidebar.selectbox("Dominio geografico", DOMINIOS)
    material_paredes = st.sidebar.selectbox("Material predominante de paredes", MATERIALES)
    abastecimiento_agua = st.sidebar.selectbox("Abastecimiento de agua", FUENTES_AGUA)
    sexo_jefe_hogar = st.sidebar.selectbox("Sexo del jefe de hogar", ["Hombre", "Mujer"])
    condicion_ocupacion_jefe = st.sidebar.selectbox(
        "Condicion de ocupacion del jefe de hogar", OCUPACIONES
    )

    miembros_hogar = st.sidebar.slider("Miembros del hogar", 1, 9, 5)
    perceptores_ingreso = st.sidebar.slider(
        "Perceptores de ingreso", 1, miembros_hogar, min(1, miembros_hogar)
    )
    dependencia_economica = round(miembros_hogar / perceptores_ingreso, 2)
    edad_jefe_hogar = st.sidebar.slider("Edad del jefe de hogar", 18, 90, 40)
    anios_educacion_jefe = st.sidebar.slider("Anios de educacion del jefe de hogar", 0, 18, 5)
    n_habitaciones_vivienda = st.sidebar.slider("Numero de habitaciones de la vivienda", 1, 8, 2)

    entrada = pd.DataFrame([{
        "area": area,
        "dominio_geografico": dominio_geografico,
        "material_paredes": material_paredes,
        "abastecimiento_agua": abastecimiento_agua,
        "sexo_jefe_hogar": sexo_jefe_hogar,
        "condicion_ocupacion_jefe": condicion_ocupacion_jefe,
        "miembros_hogar": miembros_hogar,
        "perceptores_ingreso": perceptores_ingreso,
        "dependencia_economica": dependencia_economica,
        "edad_jefe_hogar": edad_jefe_hogar,
        "anios_educacion_jefe": anios_educacion_jefe,
        "n_habitaciones_vivienda": n_habitaciones_vivienda,
    }])

    st.subheader("Datos ingresados")
    st.dataframe(entrada, use_container_width=True)

    if st.sidebar.button("Predecir condicion de pobreza"):
        modelo = cargar_modelo()
        clase = modelo.predict(entrada)[0]
        proba = modelo.predict_proba(entrada)[0, 1]

        if clase == 1:
            st.error(f"Hogar clasificado como **Pobre** (probabilidad: {proba:.1%})")
        else:
            st.success(f"Hogar clasificado como **No pobre** (probabilidad de pobreza: {proba:.1%})")


if __name__ == "__main__":
    main()

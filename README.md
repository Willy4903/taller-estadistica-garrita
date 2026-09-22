# taller-estadistica-garrita

Taller de Estadística Aplicada para la Recolección e Interpretación de Datos - INEI

Proyecto final del curso **Machine Learning en producción - Despliegue web**
(docente Orlando Advíncula): dos modelos de ML entrenados sobre datos con
estructura de la ENAHO (Encuesta Nacional de Hogares) 2022 del INEI, cada
uno desplegado como app de Streamlit.

## Nota sobre el origen de los datos

Este entorno de ejecución tiene una lista blanca de dominios de red y
bloquea el acceso a `inei.gob.pe` y `datosabiertos.gob.pe` (403 de política
de egress), por lo que no fue posible descargar el zip oficial `2022.zip`
ni la "data de muestra" para este desarrollo inicial.

En su lugar, `scripts/generar_datos_enaho_sintetico.py` genera un dataset
**sintético** de 8000 hogares que replica la estructura, los nombres de
variables y los rangos/relaciones típicas de la ENAHO 2022 (módulo 34 -
Sumaria: ingreso/gasto del hogar y condición de pobreza; módulo 01 -
Vivienda y Hogar: características de la vivienda), incluyendo una tasa de
pobreza simulada (~27%) cercana a la real reportada por el INEI para 2022.

**Para usar datos reales**: descarga el módulo 34 (Sumaria) y el módulo 01
(Vivienda) del año que prefieras desde
https://www.datosabiertos.gob.pe/search/field_tags/enaho-950, crúzalos por
`CONGLOME` + `VIVIENDA` + `HOGAR`, y reemplaza los CSV en cada carpeta
`data/` manteniendo los mismos nombres de columna que usan `train.py` y
`app.py`. Luego vuelve a correr `train.py` en cada proyecto.

## Estructura

```
proyecto1_regresion/       Regresión: gasto per cápita mensual del hogar
proyecto2_clasificacion/   Clasificación: condición de pobreza (0/1)
scripts/                   Generador del dataset sintético
```

Cada proyecto contiene:

- `data/` - CSV de entrada (recortado a las columnas usadas)
- `train.py` - preprocesamiento + GridSearchCV (RandomForest vs
  GradientBoosting) + selección del mejor modelo + guardado del `.pkl`
- `app.py` - app de Streamlit con formulario en `st.sidebar`
- `verificar_modelo.py` - predicción de un caso fijo, para comparar con la app
- `requirements.txt`

## Cómo correr cada proyecto

```bash
cd proyecto1_regresion   # o proyecto2_clasificacion
pip install -r requirements.txt
python train.py                # entrena y guarda el .pkl
python verificar_modelo.py     # predicción de referencia
streamlit run app.py           # app web
```

## Proyecto 1 - Regresión (gasto per cápita mensual)

- Target: `gasto_percapita_mensual` (S/., recodificado del gasto total del
  hogar entre `miembros_hogar`).
- Modelo ganador: **GradientBoostingRegressor**
  (`learning_rate=0.05, max_depth=3, n_estimators=300`)
- Métricas (test): R² = 0.908, MAE = S/ 113.26, RMSE = S/ 203.52
- Variables más importantes: `ingreso_trabajo_principal`, `miembros_hogar`,
  `ingreso_independiente`
- `.pkl`: 0.11 MB

## Proyecto 2 - Clasificación (condición de pobreza)

- Target: `pobre` (1 = pobre extremo o pobre no extremo, 0 = no pobre),
  recodificación dicotómica de la variable `pobreza` de la Sumaria.
- Balance de clases: 72.5% no pobre / 27.5% pobre (se optimizó por F1 por
  el desbalance).
- Modelo ganador: **RandomForestClassifier**
  (`max_depth=10, min_samples_leaf=2, n_estimators=300, class_weight="balanced"`)
- Métricas (test): Accuracy = 0.786, Precision = 0.591, Recall = 0.723,
  F1 = 0.650, ROC AUC = 0.848
- Variables más importantes: `condicion_ocupacion_jefe`,
  `dependencia_economica`, `edad_jefe_hogar`
- `.pkl`: 3.19 MB

## Verificación app vs. VS Code

En ambos proyectos se confirmó que la predicción de `verificar_modelo.py`
coincide exactamente con la de `app.py` corriendo en `streamlit run`
(mismo `.pkl`, mismos valores de entrada):

- Proyecto 1: S/ 471.73 en ambos casos.
- Proyecto 2: clase "Pobre" con 75.8% de probabilidad en ambos casos.

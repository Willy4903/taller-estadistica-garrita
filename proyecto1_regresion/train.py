"""
Proyecto 1 - Regresion: gasto per capita mensual del hogar (ENAHO 2022,
modulo 34 Sumaria + modulo 01 Vivienda; ver data/ para la nota sobre el
origen sintetico de los datos).

Pipeline: SimpleImputer + StandardScaler (numericas) / SimpleImputer +
OneHotEncoder (categoricas) dentro de un ColumnTransformer -> GridSearchCV
sobre RandomForestRegressor y GradientBoostingRegressor -> se elige el
modelo con mejor R2 en el set de prueba -> se guarda comprimido con joblib.
"""

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

DATA_PATH = "data/enaho_2022_sumaria_regresion.csv"
TARGET = "gasto_percapita_mensual"
ID_COLS = ["conglome", "vivienda", "hogar"]
MODEL_PATH = "modelo_regresion_gasto.pkl"
RANDOM_STATE = 42


def main():
    df = pd.read_csv(DATA_PATH)
    X = df.drop(columns=ID_COLS + [TARGET])
    y = df[TARGET]

    numeric_features = X.select_dtypes(include=np.number).columns.tolist()
    categorical_features = X.select_dtypes(exclude=np.number).columns.tolist()

    print("Features numericas :", numeric_features)
    print("Features categoricas:", categorical_features)
    print(f"Filas: {len(df)} | Nulos totales: {int(X.isna().sum().sum())}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE
    )

    preprocesador = ColumnTransformer([
        ("num", Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]), numeric_features),
        ("cat", Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]), categorical_features),
    ])

    modelos = {
        "RandomForest": (
            RandomForestRegressor(random_state=RANDOM_STATE),
            {
                "modelo__n_estimators": [150, 300],
                "modelo__max_depth": [8, 12],
                "modelo__min_samples_leaf": [2, 5],
            },
        ),
        "GradientBoosting": (
            GradientBoostingRegressor(random_state=RANDOM_STATE),
            {
                "modelo__n_estimators": [150, 300],
                "modelo__max_depth": [3, 4],
                "modelo__learning_rate": [0.05, 0.1],
            },
        ),
    }

    resultados = {}
    mejores_pipelines = {}

    for nombre, (estimador, param_grid) in modelos.items():
        pipeline = Pipeline([
            ("preprocesador", preprocesador),
            ("modelo", estimador),
        ])
        grid = GridSearchCV(
            pipeline, param_grid, cv=5, scoring="r2", n_jobs=-1
        )
        grid.fit(X_train, y_train)
        mejores_pipelines[nombre] = grid.best_estimator_

        y_pred = grid.best_estimator_.predict(X_test)
        r2 = r2_score(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))

        resultados[nombre] = {"r2": r2, "mae": mae, "rmse": rmse, "params": grid.best_params_}
        print(f"\n{nombre}")
        print(f"  Mejores hiperparametros: {grid.best_params_}")
        print(f"  R2 test  : {r2:.4f}")
        print(f"  MAE test : {mae:.2f}")
        print(f"  RMSE test: {rmse:.2f}")

    mejor_nombre = max(resultados, key=lambda k: resultados[k]["r2"])
    mejor_pipeline = mejores_pipelines[mejor_nombre]
    print(f"\n>>> Modelo ganador: {mejor_nombre} (R2 test = {resultados[mejor_nombre]['r2']:.4f})")

    modelo_final = mejor_pipeline.named_steps["modelo"]
    if hasattr(modelo_final, "feature_importances_"):
        nombres_ohe = mejor_pipeline.named_steps["preprocesador"] \
            .named_transformers_["cat"].named_steps["onehot"] \
            .get_feature_names_out(categorical_features)
        nombres_features = numeric_features + list(nombres_ohe)
        importancias = pd.Series(
            modelo_final.feature_importances_, index=nombres_features
        ).sort_values(ascending=False)
        print("\nImportancia de variables (top 10):")
        print(importancias.head(10).to_string())

    joblib.dump(mejor_pipeline, MODEL_PATH, compress=3)
    import os
    peso_mb = os.path.getsize(MODEL_PATH) / (1024 * 1024)
    print(f"\nModelo guardado en {MODEL_PATH} ({peso_mb:.2f} MB)")


if __name__ == "__main__":
    main()

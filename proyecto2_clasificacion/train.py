"""
Proyecto 2 - Clasificacion: condicion de pobreza monetaria del hogar
(dicotomica: 1 = pobre [pobre extremo + pobre no extremo], 0 = no pobre),
recodificada de la variable "pobreza" de la ENAHO 2022, modulo 34 Sumaria
(ver data/ para la nota sobre el origen sintetico de los datos).

Pipeline: SimpleImputer + StandardScaler (numericas) / SimpleImputer +
OneHotEncoder (categoricas) dentro de un ColumnTransformer -> GridSearchCV
sobre RandomForestClassifier y GradientBoostingClassifier, optimizando por
F1 (hay desbalance de clases) -> se elige el modelo con mejor F1 en el set
de prueba -> se guarda comprimido con joblib.
"""

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score, confusion_matrix, f1_score, precision_score,
    recall_score, roc_auc_score,
)
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

DATA_PATH = "data/enaho_2022_sumaria_clasificacion.csv"
TARGET = "pobre"
ID_COLS = ["conglome", "vivienda", "hogar"]
MODEL_PATH = "modelo_clasificacion_pobreza.pkl"
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
    print("\nBalance de clases (pobre):")
    print(y.value_counts(normalize=True).rename("proporcion"))

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
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
            RandomForestClassifier(random_state=RANDOM_STATE, class_weight="balanced"),
            {
                "modelo__n_estimators": [150, 300],
                "modelo__max_depth": [6, 10],
                "modelo__min_samples_leaf": [2, 5],
            },
        ),
        "GradientBoosting": (
            GradientBoostingClassifier(random_state=RANDOM_STATE),
            {
                "modelo__n_estimators": [150, 300],
                "modelo__max_depth": [2, 3],
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
            pipeline, param_grid, cv=5, scoring="f1", n_jobs=-1
        )
        grid.fit(X_train, y_train)
        mejores_pipelines[nombre] = grid.best_estimator_

        y_pred = grid.best_estimator_.predict(X_test)
        y_proba = grid.best_estimator_.predict_proba(X_test)[:, 1]

        metrics = {
            "accuracy": accuracy_score(y_test, y_pred),
            "precision": precision_score(y_test, y_pred),
            "recall": recall_score(y_test, y_pred),
            "f1": f1_score(y_test, y_pred),
            "roc_auc": roc_auc_score(y_test, y_proba),
        }
        resultados[nombre] = {**metrics, "params": grid.best_params_}
        mc = confusion_matrix(y_test, y_pred)

        print(f"\n{nombre}")
        print(f"  Mejores hiperparametros: {grid.best_params_}")
        print(f"  Accuracy : {metrics['accuracy']:.4f}")
        print(f"  Precision: {metrics['precision']:.4f}")
        print(f"  Recall   : {metrics['recall']:.4f}")
        print(f"  F1       : {metrics['f1']:.4f}")
        print(f"  ROC AUC  : {metrics['roc_auc']:.4f}")
        print(f"  Matriz de confusion:\n{mc}")

    mejor_nombre = max(resultados, key=lambda k: resultados[k]["f1"])
    mejor_pipeline = mejores_pipelines[mejor_nombre]
    print(f"\n>>> Modelo ganador: {mejor_nombre} (F1 test = {resultados[mejor_nombre]['f1']:.4f})")

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

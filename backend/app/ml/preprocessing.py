"""Dataset validation and leak-free preprocessing.

All data-dependent transformations (imputation, scaling, one-hot encoding) live inside an
sklearn Pipeline, so they are fitted on the TRAINING split only and then applied unchanged
to the test split and to new inputs. This prevents data leakage.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

MAX_CLASSES = 20
MAX_CATEGORY_LEVELS = 50


class DataValidationError(ValueError):
    """Raised when a dataset / configuration cannot be used for the requested task."""


def column_metadata(df: pd.DataFrame) -> list[dict]:
    meta = []
    for col in df.columns:
        s = df[col]
        numeric = pd.api.types.is_numeric_dtype(s) and not pd.api.types.is_bool_dtype(s)
        info = {
            "name": str(col),
            "dtype": str(s.dtype),
            "kind": "numeric" if numeric else "categorical",
            "missing": int(s.isna().sum()),
            "unique": int(s.nunique(dropna=True)),
        }
        if numeric and s.notna().any():
            info.update(min=float(s.min()), max=float(s.max()), mean=float(s.mean()))
        else:
            info["top_values"] = {str(k): int(v) for k, v in s.value_counts().head(8).items()}
        meta.append(info)
    return meta


def infer_task(y: pd.Series) -> str:
    """Suggest 'classification' or 'regression' from the target column."""
    if not pd.api.types.is_numeric_dtype(y) or pd.api.types.is_bool_dtype(y):
        return "classification"
    uniq = y.nunique(dropna=True)
    if uniq <= 2:
        return "classification"
    return "regression"


@dataclass
class PreparedData:
    X_train: pd.DataFrame
    X_test: pd.DataFrame
    y_train: pd.Series
    y_test: pd.Series
    numeric_features: list[str]
    categorical_features: list[str]
    dropped_rows: int
    task: str


def validate_and_split(
    df: pd.DataFrame, features: list[str], target: str, task: str, *,
    test_size: float = 0.2, random_state: int = 42, stratify: bool = True,
) -> PreparedData:
    if not features:
        raise DataValidationError("Select at least one feature.")
    missing_cols = [c for c in [*features, target] if c not in df.columns]
    if missing_cols:
        raise DataValidationError(f"Unknown column(s): {missing_cols}.")
    if target in features:
        raise DataValidationError("The target column cannot also be used as a feature (that would leak the answer).")
    if not (test_size == 0 or 0.05 <= test_size <= 0.5):
        raise DataValidationError("test_size must be 0 (no test split) or between 0.05 and 0.5.")
    if task not in ("classification", "regression"):
        raise DataValidationError("task must be 'classification' or 'regression'.")

    data = df[[*features, target]].copy()
    before = len(data)
    data = data[data[target].notna()]          # rows without a label cannot be used for training
    dropped = before - len(data)
    y = data[target]

    if task == "regression":
        if not pd.api.types.is_numeric_dtype(y):
            raise DataValidationError(f"Regression needs a numeric target; '{target}' is {y.dtype}. Use classification instead.")
        if y.nunique() < 2:
            raise DataValidationError("The target has a single value; there is nothing to learn.")
    else:
        n_classes = y.nunique()
        if n_classes < 2:
            raise DataValidationError("Classification needs at least 2 classes in the target.")
        if n_classes > MAX_CLASSES:
            raise DataValidationError(
                f"The target has {n_classes} distinct values (max {MAX_CLASSES}). "
                "It looks quantitative - use regression instead.")
        y = y.astype(str)

    if len(data) < 10:
        raise DataValidationError("At least 10 labelled rows are required.")

    X = data[features]
    numeric = [c for c in features if pd.api.types.is_numeric_dtype(X[c]) and not pd.api.types.is_bool_dtype(X[c])]
    categorical = [c for c in features if c not in numeric]
    for c in categorical:
        if X[c].nunique() > MAX_CATEGORY_LEVELS:
            raise DataValidationError(
                f"Categorical feature '{c}' has {X[c].nunique()} levels (max {MAX_CATEGORY_LEVELS}); "
                "it is probably an identifier and should not be a feature.")
        X[c] = X[c].astype(str).where(X[c].notna(), np.nan)

    if test_size == 0:   # fit on all rows (used to reproduce textbook examples that have no test set)
        return PreparedData(X, X.iloc[0:0], y, y.iloc[0:0], numeric, categorical, dropped, task)

    strat = None
    if task == "classification" and stratify:
        counts = y.value_counts()
        if counts.min() >= 2:
            strat = y
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=strat)
    if task == "classification" and y_train.nunique() < 2:
        raise DataValidationError("After splitting, the training set contains only one class.")
    return PreparedData(X_train, X_test, y_train, y_test, numeric, categorical, dropped, task)


def build_preprocessor(numeric: list[str], categorical: list[str], *, scale: bool) -> ColumnTransformer:
    num_steps = [("impute", SimpleImputer(strategy="median"))]
    if scale:
        num_steps.append(("scale", StandardScaler()))
    transformers = []
    if numeric:
        transformers.append(("num", Pipeline(num_steps), numeric))
    if categorical:
        transformers.append(("cat", Pipeline([
            ("impute", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]), categorical))
    return ColumnTransformer(transformers, verbose_feature_names_out=False)


def make_pipeline(estimator, numeric: list[str], categorical: list[str], *, scale: bool = False) -> Pipeline:
    return Pipeline([("prep", build_preprocessor(numeric, categorical, scale=scale)), ("model", estimator)])


def transformed_feature_names(pipe: Pipeline) -> list[str]:
    return [str(n) for n in pipe.named_steps["prep"].get_feature_names_out()]


def input_frame(values: dict, features: list[str], numeric: list[str]) -> pd.DataFrame:
    """Build a 1-row DataFrame for prediction, validating the user's input values."""
    missing = [f for f in features if f not in values]
    if missing:
        raise DataValidationError(f"Missing input value(s) for: {missing}.")
    row = {}
    for f in features:
        v = values[f]
        if f in numeric:
            try:
                v = float(v)
            except (TypeError, ValueError):
                raise DataValidationError(f"'{f}' must be a number (got {v!r}).")
            if not np.isfinite(v):
                raise DataValidationError(f"'{f}' must be a finite number.")
        else:
            v = str(v)
        row[f] = [v]
    return pd.DataFrame(row)[features]

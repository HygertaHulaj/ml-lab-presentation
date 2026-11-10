"""Built-in datasets: provenance and the exact transformations applied to the raw files.

Raw files live in backend/datasets/raw and were downloaded from the cited public sources.
Transformations are minimal and documented (renaming to the snake_case names DS4A uses,
deriving `sales_cat` exactly as DS4A p.371 defines it). No values are invented.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

RAW_DIR = Path(__file__).resolve().parent.parent / "datasets" / "raw"
# Official DS4A Chapter 8 data files (MIT licence): github.com/datasci4all/Datasets/Ch_8_Data
DS4A_DIR = Path(__file__).resolve().parent.parent / "datasets" / "ds4a"
DS4A_SOURCE = "Davis & Glanz, Data Science for All, official dataset repository github.com/datasci4all/Datasets (Ch_8_Data)"

# HoIDS Table 8.2 (regression.csv), transcribed from the book, p.217.
SHAH_TABLE_8_2 = {
    "x": list(range(1, 21)),
    "y": [3, 4, 8, 4, 6, 9, 8, 12, 15, 26, 35, 40, 45, 54, 49, 59, 60, 62, 63, 68],
}


def _ds4a(name: str):
    return lambda: pd.read_csv(DS4A_DIR / f"{name}.csv")


def _rock() -> pd.DataFrame:
    return pd.read_csv(RAW_DIR / "rock.csv").drop(columns=["rownames"])


# HoIDS Hands-On Problem 8.2 (OA 8.4): Airline Costs, fixed-width; column positions from airline_costs.txt (1-based).
AIRLINE_COLUMNS = [
    ("airline", 1, 20), ("flight_length_miles", 22, 28), ("plane_speed_mph", 30, 36), ("daily_flight_time_hours", 38, 44),
    ("customers_served_1000s", 46, 52),  # the file calls it "population served"; Shah's problem calls it "customers served"
    ("operating_cost_cents_per_ton_mile", 54, 60), ("revenue_tons_per_aircraft_mile", 62, 68), ("load_factor", 70, 76),
    ("available_capacity_tons_per_mile", 78, 84), ("total_assets_100k", 86, 92), ("investments_special_funds_100k", 94, 100),
    ("adjusted_assets_100k", 102, 108),
]


def _airline_costs() -> pd.DataFrame:
    return pd.read_fwf(RAW_DIR / "airline_costs.dat", colspecs=[(a - 1, b) for _, a, b in AIRLINE_COLUMNS],
                       names=[n for n, _, _ in AIRLINE_COLUMNS])


def _csm() -> pd.DataFrame:
    """HoIDS Hands-On Problem 8.4 (OA 8.6). csm_2014_2015.csv is the UCI .xlsx converted cell by cell (values unchanged)."""
    df = pd.read_csv(RAW_DIR / "csm_2014_2015.csv")
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    return df.dropna(how="all").reset_index(drop=True)


def _restaurants() -> pd.DataFrame:
    """HoIDS Hands-On Problem 8.1: the book's OA 8.3 ratings.tsv, supplied by the user. One row per restaurant: the average
    food, ambience and service ratings from previous customers (predictors) and the overall rating (outcome)."""
    return pd.read_csv(RAW_DIR / "ratings.tsv", sep="\t")


def _shah() -> pd.DataFrame:
    """Shah Table 8.2 = the book's OA 8.1 regression.csv (supplied by the user; identical to the transcription above)."""
    f = RAW_DIR / "regression.csv"
    return pd.read_csv(f) if f.exists() else pd.DataFrame(SHAH_TABLE_8_2)


def _sk_diabetes() -> pd.DataFrame:
    from sklearn.datasets import load_diabetes
    d = load_diabetes(as_frame=True, scaled=False)
    return d.frame.rename(columns={"target": "disease_progression"})


def _sk_breast_cancer() -> pd.DataFrame:
    from sklearn.datasets import load_breast_cancer
    d = load_breast_cancer(as_frame=True)
    df = d.frame.copy()
    df["diagnosis"] = np.where(df.pop("target") == 0, "malignant", "benign")
    df.columns = [c.replace(" ", "_") for c in df.columns]
    return df


def _sk_iris() -> pd.DataFrame:
    from sklearn.datasets import load_iris
    d = load_iris(as_frame=True)
    df = d.frame.copy()
    df["species"] = [d.target_names[i] for i in df.pop("target")]
    df.columns = [c.replace(" (cm)", "_cm").replace(" ", "_") for c in df.columns]
    return df


BUILTIN = {
    "diabetes": {
        "name": "Diabetes progression (example)",
        "source": "Efron et al. (2004), 'Least Angle Regression'; bundled with scikit-learn (load_diabetes, unscaled).",
        "description": "SUPPLEMENTARY — not from the textbooks. 442 patients, 10 baseline variables; target = disease progression after one year (regression).",
        "origin": "example", "loader": _sk_diabetes,
    },
    "breast_cancer": {
        "name": "Breast cancer Wisconsin (example)",
        "source": "UCI Breast Cancer Wisconsin (Diagnostic), Street, Wolberg & Mangasarian (1993); bundled with scikit-learn.",
        "description": "SUPPLEMENTARY — not from the textbooks. 569 tumours, 30 numeric features; diagnosis malignant/benign (binary classification, good for threshold demos).",
        "origin": "example", "loader": _sk_breast_cancer,
    },
    "iris": {
        "name": "Iris (example)",
        "source": "Fisher (1936); bundled with scikit-learn.",
        "description": "SUPPLEMENTARY — not from the textbooks. 150 flowers, 4 measurements, 3 species (multiclass).",
        "origin": "example", "loader": _sk_iris,
    },
    "shah_regression": {
        "name": "Shah Table 8.2 (regression.csv)",
        "source": "C. Shah, A Hands-On Introduction to Data Science, Ch. 8, Table 8.2, p.217 (transcribed)",
        "description": "20 made-up (x, y) points used in Hands-On Examples 8.1 and 8.2.",
        "origin": "textbook", "loader": _shah,
    },
    "penguins": {
        "name": "Palmer penguins (DS4A)",
        "source": DS4A_SOURCE + "; originally Horst, Hill & Gorman (2020), palmerpenguins",
        "description": "333 penguins with complete records, 3 species. DS4A Ch. 8 'Interpretability versus Complexity'.",
        "origin": "textbook", "loader": _ds4a("penguins"),
    },
    "college": {
        "name": "College (DS4A)",
        "source": DS4A_SOURCE + "; originally ISLR `College` (US News & World Report, 1995)",
        "description": "777 US colleges; target `private` (Yes/No). DS4A Ch. 8 'Reading a Decision Tree'.",
        "origin": "textbook", "loader": _ds4a("college"),
    },
    "carseats": {
        "name": "Car seats (DS4A, all 400 stores)",
        "source": DS4A_SOURCE + "; originally ISLR `Carseats` (simulated)",
        "description": "Child car-seat sales at 400 stores; `sales_cat` = High if sales > 8 (thousand units).",
        "origin": "textbook", "loader": _ds4a("carseats"),
    },
    "carseats_train": {
        "name": "carseats_train (DS4A)",
        "source": DS4A_SOURCE,
        "description": "The book's official 319-store training split.",
        "origin": "textbook", "loader": _ds4a("carseats_train"),
    },
    "carseats_test": {
        "name": "carseats_test (DS4A)",
        "source": DS4A_SOURCE,
        "description": "The book's official 81-store test split.",
        "origin": "textbook", "loader": _ds4a("carseats_test"),
    },
    "airline_costs": {
        "name": "Airline Costs (Proctor & Duncan, 1954)",
        "source": "J.W. Proctor and J.S. Duncan (1954), 'A Regression Analysis of Airline Costs', Journal of Air Law and Commerce 21(3), 282-292; "
                  "file airline_costs.dat from L. Winner's UF datasets (users.stat.ufl.edu/~winner/data, the URL in HoIDS OA 8.4), "
                  "retrieved from the Internet Archive snapshot of 2018-03-25 because the original host has moved. Used in HoIDS Hands-On Problem 8.2.",
        "description": "31 US airlines: flight length, plane speed, daily flight time, customers served (1000s), operating cost, load factor, assets.",
        "origin": "textbook", "loader": _airline_costs,
    },
    "csm_movies": {
        "name": "CSM: Conventional and Social Media Movies 2014-2015",
        "source": "M. Ahmed et al., UCI Machine Learning Repository dataset 424 (CC BY 4.0), doi:10.24432/C5SP5T; "
                  "the URL in HoIDS OA 8.6. Used in HoIDS Hands-On Problem 8.4.",
        "description": "Movies of 2014-2015: ratings, genre, gross, budget, screens, sequel, sentiment, YouTube views/likes/dislikes/comments, aggregate followers.",
        "origin": "textbook", "loader": _csm,
    },
    "restaurant_ratings": {
        "name": "Restaurant ratings (HoIDS OA 8.3)",
        "source": "C. Shah, A Hands-On Introduction to Data Science, online appendix OA 8.3, file ratings.tsv (supplied by the user). "
                  "Used in HoIDS Hands-On Problem 8.1.",
        "description": "15 restaurants: average food, ambience and service ratings from previous customers, and the overall rating.",
        "origin": "textbook", "loader": _restaurants,
    },
    "rock": {
        "name": "Rock samples (BP Research)",
        "source": "R `datasets::rock` (BP Research, image analysis by Ronit Katz, Oxford) via Rdatasets. Used in HoIDS Hands-On Problem 8.3.",
        "description": "48 rock samples: area, peri, shape, perm (permeability).",
        "origin": "textbook", "loader": _rock,
    },
}


def load_builtin(key: str) -> pd.DataFrame:
    if key not in BUILTIN:
        raise KeyError(key)
    return BUILTIN[key]["loader"]()

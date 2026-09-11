"""
Preprocessing + feature engineering for the energy forecasting pipeline.

Handles:
- flexible timestamp parsing
- missing value cleaning (interpolation)
- basic sanity checks (negative / impossible values)
- feature extraction: hour, day, week, month, weekday/weekend, lag features,
  rolling averages, and temperature if present
"""
from __future__ import annotations
import pandas as pd
import numpy as np


REQUIRED_COLUMNS = {"timestamp", "energy_consumption"}


class DatasetValidationError(Exception):
    pass


def load_and_clean(df: pd.DataFrame) -> pd.DataFrame:
    cols_lower = {c.lower().strip(): c for c in df.columns}
    missing = REQUIRED_COLUMNS - set(cols_lower.keys())
    if missing:
        raise DatasetValidationError(
            f"Missing required column(s): {', '.join(missing)}. "
            f"Expected at least: timestamp, energy_consumption"
        )

    df = df.rename(columns={cols_lower["timestamp"]: "timestamp",
                             cols_lower["energy_consumption"]: "energy_consumption"})

    # flexible timestamp parsing
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    bad_ts = df["timestamp"].isna().sum()
    df = df.dropna(subset=["timestamp"]).sort_values("timestamp").reset_index(drop=True)

    # coerce consumption to numeric, drop impossible negatives
    df["energy_consumption"] = pd.to_numeric(df["energy_consumption"], errors="coerce")
    df.loc[df["energy_consumption"] < 0, "energy_consumption"] = np.nan

    # interpolate missing values (linear), then forward/back fill any edges
    df["energy_consumption"] = df["energy_consumption"].interpolate(method="linear")
    df["energy_consumption"] = df["energy_consumption"].bfill().ffill()

    if "temperature" in cols_lower:
        df = df.rename(columns={cols_lower["temperature"]: "temperature"})
        df["temperature"] = pd.to_numeric(df["temperature"], errors="coerce")
        df["temperature"] = df["temperature"].interpolate().bfill().ffill()

    if df.empty:
        raise DatasetValidationError("No valid rows remained after cleaning.")

    df.attrs["rows_dropped_bad_timestamp"] = int(bad_ts)
    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["hour"] = df["timestamp"].dt.hour
    df["day"] = df["timestamp"].dt.day
    df["week"] = df["timestamp"].dt.isocalendar().week.astype(int)
    df["month"] = df["timestamp"].dt.month
    df["weekday"] = df["timestamp"].dt.weekday
    df["is_weekend"] = (df["weekday"] >= 5).astype(int)

    # lag features (previous hour, previous day same hour, previous week same hour)
    df["lag_1h"] = df["energy_consumption"].shift(1)
    df["lag_24h"] = df["energy_consumption"].shift(24)
    df["lag_168h"] = df["energy_consumption"].shift(168)

    # rolling stats
    df["rolling_mean_24h"] = df["energy_consumption"].rolling(24, min_periods=1).mean()
    df["rolling_std_24h"] = df["energy_consumption"].rolling(24, min_periods=1).std().fillna(0)

    if "temperature" not in df.columns:
        df["temperature"] = np.nan
    df["temperature"] = df["temperature"].fillna(df["temperature"].mean() if df["temperature"].notna().any() else 22.0)

    df = df.dropna().reset_index(drop=True)
    return df


FEATURE_COLUMNS = [
    "hour", "day", "week", "month", "weekday", "is_weekend",
    "lag_1h", "lag_24h", "lag_168h",
    "rolling_mean_24h", "rolling_std_24h", "temperature",
]
TARGET_COLUMN = "energy_consumption"

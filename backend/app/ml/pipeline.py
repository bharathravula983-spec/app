"""
Model training + forecasting engine.

Trains Linear Regression, Random Forest, and XGBoost on engineered features,
compares them on MAE / RMSE / MAPE, and auto-selects the best model for
forecasting. (LSTM is planned for a later stage - see README "Next steps".)
"""
from __future__ import annotations
import numpy as np
import pandas as pd
from dataclasses import dataclass, field
from typing import Optional

from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
from xgboost import XGBRegressor

from .preprocessing import FEATURE_COLUMNS, TARGET_COLUMN


def _metrics(y_true, y_pred) -> dict:
    mae = mean_absolute_error(y_true, y_pred)
    rmse = float(root_mean_squared_error(y_true, y_pred))
    # avoid div-by-zero in MAPE
    denom = np.where(np.abs(y_true) < 1e-6, 1e-6, np.abs(y_true))
    mape = float(np.mean(np.abs((np.array(y_true) - np.array(y_pred)) / denom)) * 100)
    return {"mae": round(mae, 4), "rmse": round(rmse, 4), "mape": round(mape, 2)}


@dataclass
class TrainedModelStore:
    models: dict = field(default_factory=dict)
    metrics: dict = field(default_factory=dict)
    best_model_name: Optional[str] = None
    feature_df: Optional[pd.DataFrame] = None
    raw_df: Optional[pd.DataFrame] = None

    def best_model(self):
        return self.models[self.best_model_name]


def train_and_compare(feature_df: pd.DataFrame, raw_df: pd.DataFrame) -> TrainedModelStore:
    X = feature_df[FEATURE_COLUMNS].values
    y = feature_df[TARGET_COLUMN].values

    # time-based split (no shuffling) - last 20% as test
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    candidates = {
        "Linear Regression": LinearRegression(),
        "Random Forest": RandomForestRegressor(n_estimators=150, max_depth=10, random_state=42, n_jobs=-1),
        "XGBoost": XGBRegressor(n_estimators=200, max_depth=5, learning_rate=0.08, random_state=42, verbosity=0),
    }

    store = TrainedModelStore(feature_df=feature_df, raw_df=raw_df)
    best_mae = float("inf")

    for name, model in candidates.items():
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        m = _metrics(y_test, preds)
        store.models[name] = model
        store.metrics[name] = m
        if m["mae"] < best_mae:
            best_mae = m["mae"]
            store.best_model_name = name

    # refit best model on full data for production forecasting
    store.models[store.best_model_name].fit(X, y)
    return store


def forecast_next(store: TrainedModelStore, horizon_hours: int) -> list[dict]:
    """Iteratively forecast `horizon_hours` ahead using the best model,
    feeding each prediction back in as a lag feature for the next step."""
    model = store.best_model()
    df = store.feature_df.copy()
    last_ts = df["timestamp"].iloc[-1] if "timestamp" in df.columns else None
    if last_ts is None:
        last_ts = store.raw_df["timestamp"].iloc[-1]

    history = list(df[TARGET_COLUMN].values)  # for lag lookups
    forecasts = []

    for step in range(1, horizon_hours + 1):
        ts = last_ts + pd.Timedelta(hours=step)
        hour, day, week, month = ts.hour, ts.day, ts.isocalendar()[1], ts.month
        weekday = ts.weekday()
        is_weekend = int(weekday >= 5)

        lag_1h = history[-1]
        lag_24h = history[-24] if len(history) >= 24 else history[0]
        lag_168h = history[-168] if len(history) >= 168 else history[0]
        rolling_mean_24h = np.mean(history[-24:])
        rolling_std_24h = np.std(history[-24:]) if len(history) >= 2 else 0.0
        temperature = df["temperature"].iloc[-1]

        features = np.array([[hour, day, week, month, weekday, is_weekend,
                               lag_1h, lag_24h, lag_168h,
                               rolling_mean_24h, rolling_std_24h, temperature]])
        pred = float(model.predict(features)[0])
        pred = max(0.02, pred)
        history.append(pred)
        forecasts.append({"timestamp": ts.strftime("%Y-%m-%d %H:%M"), "predicted_consumption": round(pred, 3)})

    return forecasts

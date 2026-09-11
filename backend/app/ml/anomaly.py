"""
Anomaly detection for daily electricity consumption.

Uses a rolling z-score against the user's own historical daily pattern
(per weekday, to avoid flagging normal weekend-vs-weekday differences).
"""
from __future__ import annotations
import pandas as pd
import numpy as np


def detect_anomalies(raw_df: pd.DataFrame, z_threshold: float = 2.2) -> list[dict]:
    df = raw_df.copy()
    df["date"] = df["timestamp"].dt.date
    df["weekday"] = df["timestamp"].dt.weekday

    daily = df.groupby(["date", "weekday"], as_index=False)["energy_consumption"].sum()
    daily = daily.rename(columns={"energy_consumption": "daily_kwh"})

    anomalies = []
    for weekday, group in daily.groupby("weekday"):
        if len(group) < 3:
            continue
        mean = group["daily_kwh"].mean()
        std = group["daily_kwh"].std() or 1e-6
        group = group.copy()
        group["z"] = (group["daily_kwh"] - mean) / std
        flagged = group[group["z"].abs() >= z_threshold]
        for _, row in flagged.iterrows():
            anomalies.append({
                "date": str(row["date"]),
                "daily_kwh": round(float(row["daily_kwh"]), 2),
                "expected_kwh": round(float(mean), 2),
                "z_score": round(float(row["z"]), 2),
                "severity": "high" if abs(row["z"]) >= 3 else "moderate",
                "message": (
                    f"Consumption on {row['date']} was {round(float(row['daily_kwh']), 1)} kWh, "
                    f"about {round((row['daily_kwh'] / mean - 1) * 100)}% "
                    f"{'above' if row['daily_kwh'] > mean else 'below'} your usual "
                    f"{['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][weekday]} average "
                    f"({round(float(mean), 1)} kWh)."
                ),
            })

    anomalies.sort(key=lambda a: a["date"], reverse=True)
    return anomalies[:20]

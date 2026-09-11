"""
Synthetic smart-meter dataset generator.

Produces hourly household electricity consumption with realistic structure:
- daily cycle (morning + evening peaks)
- weekday vs weekend behaviour
- seasonal drift + temperature influence
- random noise + occasional anomaly spikes

This stands in for a real smart-meter CSV until the user uploads their own
(the /upload endpoint accepts any CSV with timestamp,energy_consumption columns
and this generator is bypassed).
"""
from __future__ import annotations
import numpy as np
import pandas as pd
from datetime import datetime, timedelta


def generate_synthetic_dataset(days: int = 180, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    start = datetime(2026, 1, 1)
    hours = days * 24
    timestamps = [start + timedelta(hours=i) for i in range(hours)]

    rows = []
    for ts in timestamps:
        hour = ts.hour
        weekday = ts.weekday()  # 0=Mon
        is_weekend = weekday >= 5
        day_of_year = ts.timetuple().tm_yday

        # base daily load curve (kWh) - morning + evening peaks
        base = (
            0.35
            + 0.55 * np.exp(-((hour - 8) ** 2) / 6)   # morning peak ~8am
            + 0.9 * np.exp(-((hour - 19.5) ** 2) / 8)  # evening peak ~7:30pm
            + 0.15 * np.exp(-((hour - 13) ** 2) / 10)  # small midday bump
        )

        if is_weekend:
            base *= 1.15  # more usage at home on weekends
            base += 0.1 * np.exp(-((hour - 11) ** 2) / 8)  # later weekend mornings

        # seasonal effect (more AC load in summer months, proxy via sinusoid)
        seasonal = 0.25 * np.sin(2 * np.pi * (day_of_year - 172) / 365)
        temperature = 24 + 8 * np.sin(2 * np.pi * (day_of_year - 172) / 365) + rng.normal(0, 1.5)
        temp_effect = max(0, (temperature - 28)) * 0.05  # extra load when hot (AC)

        noise = rng.normal(0, 0.08)
        value = max(0.05, base + seasonal + temp_effect + noise)

        # rare anomaly spikes (~1.2% of hours) - e.g. appliance left running
        if rng.random() < 0.012:
            value *= rng.uniform(1.8, 2.6)

        rows.append({
            "timestamp": ts.strftime("%Y-%m-%d %H:%M"),
            "energy_consumption": round(float(value), 3),
            "temperature": round(float(temperature), 1),
        })

    return pd.DataFrame(rows)


if __name__ == "__main__":
    df = generate_synthetic_dataset()
    df.to_csv("../data/sample_smart_meter.csv", index=False)
    print(f"Generated {len(df)} rows")

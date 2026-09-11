"""
Energy optimization / recommendation engine + cost estimation.

All recommendations are derived from the user's own consumption data
(peak-hour analysis, week-over-week comparison, forecast trend) rather
than generic canned tips.
"""
from __future__ import annotations
import pandas as pd
import numpy as np


def peak_hours(raw_df: pd.DataFrame, top_n: int = 3) -> list[dict]:
    df = raw_df.copy()
    df["hour"] = df["timestamp"].dt.hour
    by_hour = df.groupby("hour")["energy_consumption"].mean().sort_values(ascending=False)
    return [{"hour": int(h), "avg_kwh": round(float(v), 3)} for h, v in by_hour.head(top_n).items()]


def generate_insights(raw_df: pd.DataFrame, forecast: list[dict]) -> list[dict]:
    insights = []
    df = raw_df.copy()
    df["date"] = df["timestamp"].dt.date

    daily = df.groupby("date")["energy_consumption"].sum()
    if len(daily) >= 14:
        last_7 = daily.iloc[-7:].mean()
        prev_7 = daily.iloc[-14:-7].mean()
        pct = (last_7 / prev_7 - 1) * 100 if prev_7 > 0 else 0
        if abs(pct) >= 5:
            direction = "higher" if pct > 0 else "lower"
            insights.append({
                "type": "trend",
                "message": f"Your average daily usage this week ({last_7:.1f} kWh) is "
                           f"{abs(pct):.0f}% {direction} than last week ({prev_7:.1f} kWh)."
            })

    peaks = peak_hours(raw_df, top_n=2)
    if peaks:
        hrs = sorted(p["hour"] for p in peaks)
        insights.append({
            "type": "peak_hours",
            "message": f"Your electricity usage is typically highest around "
                       f"{hrs[0]}:00\u2013{(hrs[-1]+1)%24}:00. Shifting high-power appliance use "
                       f"outside this window could reduce peak load."
        })

    if forecast:
        forecast_avg = np.mean([f["predicted_consumption"] for f in forecast[:24]]) if len(forecast) >= 24 else np.mean([f["predicted_consumption"] for f in forecast])
        recent_avg = daily.iloc[-7:].mean() / 24 if len(daily) >= 7 else df["energy_consumption"].mean()
        if forecast_avg > recent_avg * 1.1:
            insights.append({
                "type": "forecast_warning",
                "message": f"Predicted hourly consumption ({forecast_avg:.2f} kWh) is trending above "
                           f"your recent average ({recent_avg:.2f} kWh/hr). Your estimated bill may increase "
                           f"if this pattern continues."
            })
        else:
            insights.append({
                "type": "forecast_stable",
                "message": "Your predicted consumption is in line with your recent average \u2014 no unusual "
                           "increase expected."
            })

    weekday_avg = df.groupby(df["timestamp"].dt.weekday)["energy_consumption"].mean()
    if len(weekday_avg) == 7:
        weekend_avg = weekday_avg.loc[[5, 6]].mean()
        weekday_only_avg = weekday_avg.loc[[0, 1, 2, 3, 4]].mean()
        if weekend_avg > weekday_only_avg * 1.15:
            insights.append({
                "type": "weekend_pattern",
                "message": f"Weekend hourly usage averages {weekend_avg:.2f} kWh vs {weekday_only_avg:.2f} kWh "
                           f"on weekdays \u2014 consider scheduling high-power chores (laundry, dishwasher) "
                           f"for off-peak weekend hours."
            })

    if not insights:
        insights.append({"type": "info", "message": "Your consumption pattern looks stable and consistent."})

    return insights


def estimate_bill(kwh: float, rate_per_kwh: float, fixed_charge: float = 0.0) -> float:
    return round(kwh * rate_per_kwh + fixed_charge, 2)


def cost_summary(raw_df: pd.DataFrame, forecast: list[dict], rate_per_kwh: float, fixed_charge: float = 0.0) -> dict:
    df = raw_df.copy()
    df["date"] = df["timestamp"].dt.date
    daily = df.groupby("date")["energy_consumption"].sum()

    current_month_kwh = daily.iloc[-30:].sum() if len(daily) >= 1 else 0.0
    previous_month_kwh = daily.iloc[-60:-30].sum() if len(daily) >= 60 else current_month_kwh

    forecast_days = max(1, len(forecast) // 24)
    forecast_kwh_total = sum(f["predicted_consumption"] for f in forecast)
    # scale forecast to a full 30-day projection using the forecast's daily rate
    projected_daily_rate = forecast_kwh_total / max(1, forecast_days)
    predicted_month_kwh = projected_daily_rate * 30

    current_bill = estimate_bill(current_month_kwh, rate_per_kwh, fixed_charge)
    previous_bill = estimate_bill(previous_month_kwh, rate_per_kwh, fixed_charge)
    predicted_bill = estimate_bill(predicted_month_kwh, rate_per_kwh, fixed_charge)

    potential_savings = round(max(0.0, predicted_bill - current_bill) * 0, 2)  # placeholder, refined below
    # savings potential: shaving 10% off peak-hour usage
    savings_potential = round(predicted_bill * 0.10, 2)

    return {
        "rate_per_kwh": rate_per_kwh,
        "current_month_kwh": round(float(current_month_kwh), 2),
        "previous_month_kwh": round(float(previous_month_kwh), 2),
        "predicted_month_kwh": round(float(predicted_month_kwh), 2),
        "current_bill": current_bill,
        "previous_bill": previous_bill,
        "predicted_bill": predicted_bill,
        "difference_vs_previous": round(current_bill - previous_bill, 2),
        "potential_monthly_savings": savings_potential,
    }

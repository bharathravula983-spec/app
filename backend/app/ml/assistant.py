"""
AI Energy Assistant.

A lightweight intent-matching assistant that answers natural-language
questions using the user's real consumption/forecast/insight data - no
external LLM call required, so it works fully offline. If an ANTHROPIC_API_KEY
is configured, `answer()` can optionally be swapped to call the Claude API for
more open-ended phrasing (see README "Next steps").
"""
from __future__ import annotations
import re
import pandas as pd
import numpy as np

from .insights import peak_hours, cost_summary


def _weekly_usage(raw_df: pd.DataFrame) -> float:
    df = raw_df.copy()
    cutoff = df["timestamp"].max() - pd.Timedelta(days=7)
    return float(df[df["timestamp"] > cutoff]["energy_consumption"].sum())


def answer(question: str, raw_df: pd.DataFrame, forecast: list[dict], insights: list[dict],
           rate_per_kwh: float) -> str:
    q = question.lower().strip()

    if re.search(r"how much.*(this week|week)", q) or "used this week" in q:
        wk = _weekly_usage(raw_df)
        return f"You've used about {wk:.1f} kWh over the last 7 days."

    if re.search(r"(tomorrow|next day)", q):
        if forecast:
            next_day = sum(f["predicted_consumption"] for f in forecast[:24])
            return f"Your predicted consumption for tomorrow is about {next_day:.1f} kWh."
        return "I don't have a forecast yet \u2014 try training the model first."

    if re.search(r"why.*(increase|higher|went up)", q):
        trend = next((i["message"] for i in insights if i["type"] in ("trend", "forecast_warning")), None)
        return trend or "I don't see a significant increase in your recent usage pattern."

    if re.search(r"which day.*(most|highest)|most energy", q):
        df = raw_df.copy()
        df["date"] = df["timestamp"].dt.date
        daily = df.groupby("date")["energy_consumption"].sum().sort_values(ascending=False)
        if len(daily):
            top_date = daily.index[0]
            return f"Your highest-consumption day recently was {top_date} at {daily.iloc[0]:.1f} kWh."
        return "Not enough data yet to determine this."

    if re.search(r"reduce|save|lower my (electricity|usage|bill)", q):
        peaks = peak_hours(raw_df, top_n=2)
        if peaks:
            hrs = ", ".join(f"{p['hour']}:00" for p in peaks)
            return (f"Your usage peaks around {hrs}. Shifting high-power appliances "
                    f"(AC, washing machine, water heater) outside these hours, and unplugging idle "
                    f"devices, are the fastest ways to cut consumption.")
        return "Try running high-power appliances outside your typical peak hours."

    if re.search(r"predicted (electricity )?bill|bill.*predict", q):
        summary = cost_summary(raw_df, forecast, rate_per_kwh)
        return (f"Based on current trends, your predicted monthly bill is about "
                f"\u20b9{summary['predicted_bill']:.0f}, compared to \u20b9{summary['current_bill']:.0f} this month.")

    if re.search(r"peak|highest usage time", q):
        peaks = peak_hours(raw_df, top_n=3)
        hrs = ", ".join(f"{p['hour']}:00 ({p['avg_kwh']:.2f} kWh avg)" for p in peaks)
        return f"Your top usage hours are: {hrs}."

    # fallback: general summary
    wk = _weekly_usage(raw_df)
    top_insight = insights[0]["message"] if insights else ""
    return (f"Here's a quick summary: you've used about {wk:.1f} kWh in the last 7 days. {top_insight} "
            f"Ask me about tomorrow's forecast, your peak hours, or your predicted bill for more detail.")

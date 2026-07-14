"""
Neural-network based expense forecasting.

Unlike the statistical forecast in routes/forecast.py (a weighted moving
average), this module trains a small LSTM (Long Short-Term Memory) neural
network — using TensorFlow/Keras — on each user's own daily expense history
and uses it to predict future daily spending.

The model is intentionally small and is trained on-demand per request, since
personal-finance datasets are small (weeks/months of data, not millions of
rows). This keeps training time to a few seconds while still being a genuine
trained neural network rather than a hand-coded formula.
"""

import os

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")  # silence TensorFlow C++ logs

from datetime import date, timedelta

import numpy as np
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from extensions import db
from models import Transaction

neural_bp = Blueprint("neural_forecast", __name__)

WINDOW_SIZE = 7          # days of history the LSTM looks at to predict the next day
LOOKBACK_DAYS = 120       # how much history to pull from the database
DEFAULT_FORECAST_DAYS = 30
MIN_NON_ZERO_DAYS = 14    # minimum days with recorded expenses before we'll train


def _daily_expense_series(user_id):
    """Returns a list of daily expense totals for the last LOOKBACK_DAYS days
    (0.0 for days with no recorded expense), oldest first."""
    today = date.today()
    start = today - timedelta(days=LOOKBACK_DAYS)

    rows = (
        db.session.query(Transaction.date, func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.date >= start,
            Transaction.date <= today,
        )
        .group_by(Transaction.date)
        .all()
    )
    by_date = {d: float(total) for d, total in rows}

    series = []
    for i in range(LOOKBACK_DAYS + 1):
        day = start + timedelta(days=i)
        series.append(by_date.get(day, 0.0))
    return series


def _build_windows(series, window):
    X, y = [], []
    for i in range(len(series) - window):
        X.append(series[i : i + window])
        y.append(series[i + window])
    return np.array(X, dtype="float32"), np.array(y, dtype="float32")


def _train_and_forecast(series, forecast_days):
    """Trains a small LSTM on `series` and forecasts `forecast_days` ahead.
    Returns (daily_predictions, final_training_loss)."""
    import tensorflow as tf
    from tensorflow.keras import layers, models

    series_arr = np.array(series, dtype="float32")
    max_val = float(series_arr.max()) if series_arr.max() > 0 else 1.0
    normalized = (series_arr / max_val).tolist()

    X, y = _build_windows(normalized, WINDOW_SIZE)
    X = X.reshape((X.shape[0], WINDOW_SIZE, 1))

    tf.random.set_seed(42)
    model = models.Sequential(
        [
            layers.Input(shape=(WINDOW_SIZE, 1)),
            layers.LSTM(32, activation="tanh"),
            layers.Dense(16, activation="relu"),
            layers.Dense(1),
        ]
    )
    model.compile(optimizer="adam", loss="mse")
    history = model.fit(X, y, epochs=60, batch_size=8, verbose=0)

    # Recursive multi-step forecasting: each predicted day feeds into the
    # window used to predict the next one.
    window = normalized[-WINDOW_SIZE:]
    predictions_normalized = []
    for _ in range(forecast_days):
        x_input = np.array(window[-WINDOW_SIZE:], dtype="float32").reshape((1, WINDOW_SIZE, 1))
        pred = float(model.predict(x_input, verbose=0)[0][0])
        pred = max(0.0, pred)
        predictions_normalized.append(pred)
        window.append(pred)

    predictions = [p * max_val for p in predictions_normalized]
    final_loss = float(history.history["loss"][-1])
    return predictions, final_loss


@neural_bp.route("/expense-forecast", methods=["GET"])
@jwt_required()
def neural_expense_forecast():
    user_id = int(get_jwt_identity())
    forecast_days = min(max(int(request.args.get("days", DEFAULT_FORECAST_DAYS)), 1), 90)

    series = _daily_expense_series(user_id)
    non_zero_days = sum(1 for v in series if v > 0)

    if non_zero_days < MIN_NON_ZERO_DAYS:
        return (
            jsonify(
                {
                    "insufficient_data": True,
                    "message": (
                        "Not enough transaction history yet to train the neural network. "
                        f"Add expense transactions on at least {MIN_NON_ZERO_DAYS} different "
                        f"days (currently {non_zero_days}) and try again."
                    ),
                    "non_zero_days": non_zero_days,
                    "required_non_zero_days": MIN_NON_ZERO_DAYS,
                }
            ),
            200,
        )

    predictions, final_loss = _train_and_forecast(series, forecast_days)

    today = date.today()
    historical = [
        {
            "date": (today - timedelta(days=LOOKBACK_DAYS - i)).isoformat(),
            "amount": round(v, 2),
        }
        for i, v in enumerate(series)
    ]
    forecast = [
        {"date": (today + timedelta(days=i + 1)).isoformat(), "amount": round(p, 2)}
        for i, p in enumerate(predictions)
    ]

    return (
        jsonify(
            {
                "insufficient_data": False,
                "model": "LSTM (TensorFlow/Keras)",
                "description": (
                    "A 2-layer LSTM neural network trained on-demand on this account's own "
                    f"daily expense history (last {LOOKBACK_DAYS} days), using a sliding "
                    f"{WINDOW_SIZE}-day window to recursively predict future daily spending."
                ),
                "window_size": WINDOW_SIZE,
                "training_epochs": 60,
                "final_training_loss": round(final_loss, 6),
                "historical_daily_expenses": historical,
                "forecast_daily_expenses": forecast,
                "predicted_total": round(sum(p["amount"] for p in forecast), 2),
                "forecast_days": forecast_days,
            }
        ),
        200,
    )

"""
Anomaly detection using an autoencoder neural network.

This is deliberately a *different* neural network paradigm from the LSTM in
neural_forecast.py: the LSTM is supervised (predicts a known next value), this
autoencoder is unsupervised (learns to reconstruct "normal" transactions, and
flags the ones it reconstructs badly as unusual).

The model learns each user's own spending pattern — transaction amount (log
+ scaled) and day-of-week — and is trained fresh on-demand per request, since
personal transaction histories are small.
"""

import os

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")

import math

import numpy as np
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import Transaction

anomaly_bp = Blueprint("anomaly_detection", __name__)

MIN_TRANSACTIONS = 20
DEFAULT_LIMIT = 200


def _features_for_transactions(transactions):
    amounts = np.array([t.amount for t in transactions], dtype="float32")
    log_amounts = np.log1p(amounts)
    lo, hi = float(log_amounts.min()), float(log_amounts.max())
    scaled_amount = (log_amounts - lo) / (hi - lo) if hi > lo else np.zeros_like(log_amounts)

    weekdays = np.array([t.date.weekday() for t in transactions], dtype="float32")
    angle = weekdays / 7.0 * 2 * math.pi
    weekday_sin = np.sin(angle)
    weekday_cos = np.cos(angle)

    features = np.stack([scaled_amount, weekday_sin, weekday_cos], axis=1)
    return features.astype("float32")


def _train_autoencoder(features):
    import tensorflow as tf
    from tensorflow.keras import layers, models

    tf.random.set_seed(42)
    input_dim = features.shape[1]

    model = models.Sequential(
        [
            layers.Input(shape=(input_dim,)),
            layers.Dense(4, activation="relu"),
            layers.Dense(2, activation="relu"),  # bottleneck — forces compression
            layers.Dense(4, activation="relu"),
            layers.Dense(input_dim, activation="linear"),
        ]
    )
    model.compile(optimizer="adam", loss="mse")
    history = model.fit(features, features, epochs=100, batch_size=8, verbose=0)

    reconstructions = model.predict(features, verbose=0)
    errors = np.mean(np.square(features - reconstructions), axis=1)
    return errors, float(history.history["loss"][-1])


@anomaly_bp.route("/anomaly-detection", methods=["GET"])
@jwt_required()
def anomaly_detection():
    user_id = int(get_jwt_identity())
    limit = min(max(int(request.args.get("limit", DEFAULT_LIMIT)), 20), 1000)

    transactions = (
        Transaction.query.filter_by(user_id=user_id, type="expense")
        .order_by(Transaction.date.desc())
        .limit(limit)
        .all()
    )

    if len(transactions) < MIN_TRANSACTIONS:
        return (
            jsonify(
                {
                    "insufficient_data": True,
                    "message": (
                        "Not enough expense transactions yet to train the anomaly-detection "
                        f"model. Add at least {MIN_TRANSACTIONS} expense transactions "
                        f"(currently {len(transactions)}) and try again."
                    ),
                    "transaction_count": len(transactions),
                    "required_transactions": MIN_TRANSACTIONS,
                }
            ),
            200,
        )

    features = _features_for_transactions(transactions)
    errors, final_loss = _train_autoencoder(features)

    mean_err = float(np.mean(errors))
    std_err = float(np.std(errors))
    threshold = mean_err + 2 * std_err

    results = []
    for t, err in zip(transactions, errors):
        results.append(
            {
                "id": t.id,
                "date": t.date.isoformat(),
                "amount": t.amount,
                "category_name": t.category.name if t.category else None,
                "notes": t.notes,
                "reconstruction_error": round(float(err), 6),
                "is_anomaly": bool(err > threshold),
            }
        )

    anomalies = sorted(
        (r for r in results if r["is_anomaly"]), key=lambda r: -r["reconstruction_error"]
    )

    return (
        jsonify(
            {
                "insufficient_data": False,
                "model": "Autoencoder (TensorFlow/Keras)",
                "description": (
                    "A dense autoencoder (3 → 4 → 2 → 4 → 3) trained on-demand on this "
                    "account's own expense transactions — amount and day-of-week pattern. "
                    "Transactions the model reconstructs poorly are flagged as unusual."
                ),
                "transaction_count": len(transactions),
                "final_training_loss": round(final_loss, 6),
                "threshold": round(threshold, 6),
                "anomaly_count": len(anomalies),
                "anomalies": anomalies[:20],
            }
        ),
        200,
    )

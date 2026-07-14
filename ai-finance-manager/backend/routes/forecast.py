from datetime import date
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import extract, func

from extensions import db
from models import Transaction

forecast_bp = Blueprint("forecast", __name__)


def _monthly_totals(user_id, tx_type, months_back=6):
    today = date.today()
    totals = []
    year, month = today.year, today.month
    for _ in range(months_back):
        total = (
            Transaction.query.filter(
                Transaction.user_id == user_id,
                Transaction.type == tx_type,
                extract("year", Transaction.date) == year,
                extract("month", Transaction.date) == month,
            )
            .with_entities(func.sum(Transaction.amount))
            .scalar()
            or 0
        )
        totals.append({"year": year, "month": month, "total": total})
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    return list(reversed(totals))


def _simple_forecast(history):
    """Weighted moving average — recent months count more."""
    values = [h["total"] for h in history if h["total"] > 0] or [h["total"] for h in history]
    if not values:
        return 0.0
    weights = list(range(1, len(values) + 1))
    weighted_sum = sum(v * w for v, w in zip(values, weights))
    return round(weighted_sum / sum(weights), 2)


@forecast_bp.route("", methods=["GET"])
@jwt_required()
def get_forecast():
    user_id = int(get_jwt_identity())

    income_history = _monthly_totals(user_id, "income")
    expense_history = _monthly_totals(user_id, "expense")

    predicted_income = _simple_forecast(income_history)
    predicted_expense = _simple_forecast(expense_history)
    predicted_savings = round(predicted_income - predicted_expense, 2)

    cash_flow = []
    running_balance = 0
    for inc, exp in zip(income_history, expense_history):
        running_balance += inc["total"] - exp["total"]
        cash_flow.append(
            {
                "year": inc["year"],
                "month": inc["month"],
                "income": inc["total"],
                "expense": exp["total"],
                "cumulative_balance": round(running_balance, 2),
            }
        )

    next_month = (date.today().month % 12) + 1
    next_year = date.today().year + (1 if date.today().month == 12 else 0)

    return jsonify(
        {
            "income_history": income_history,
            "expense_history": expense_history,
            "cash_flow_history": cash_flow,
            "next_month": {"month": next_month, "year": next_year},
            "predicted_income": predicted_income,
            "predicted_expense": predicted_expense,
            "predicted_savings": predicted_savings,
            "projected_cumulative_balance": round(
                running_balance + predicted_income - predicted_expense, 2
            ),
        }
    ), 200

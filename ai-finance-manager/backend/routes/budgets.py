from sqlalchemy import extract, func
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Budget, Transaction

budgets_bp = Blueprint("budgets", __name__)


def _spent_amount(user_id, category_id, month, year):
    query = Transaction.query.filter(
        Transaction.user_id == user_id,
        Transaction.type == "expense",
        extract("month", Transaction.date) == month,
        extract("year", Transaction.date) == year,
    )
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    total = query.with_entities(func.sum(Transaction.amount)).scalar()
    return total or 0.0


@budgets_bp.route("", methods=["GET"])
@jwt_required()
def list_budgets():
    user_id = int(get_jwt_identity())
    month = int(request.args.get("month", 0)) or None
    year = int(request.args.get("year", 0)) or None

    query = Budget.query.filter_by(user_id=user_id)
    if month:
        query = query.filter_by(month=month)
    if year:
        query = query.filter_by(year=year)

    budgets = query.all()
    result = []
    for b in budgets:
        spent = _spent_amount(user_id, b.category_id, b.month, b.year)
        data = b.to_dict()
        data["spent"] = spent
        data["remaining"] = round(b.limit_amount - spent, 2)
        data["percent_used"] = round((spent / b.limit_amount) * 100, 1) if b.limit_amount else 0
        data["overspent"] = spent > b.limit_amount
        result.append(data)

    return jsonify({"budgets": result}), 200


@budgets_bp.route("", methods=["POST"])
@jwt_required()
def create_budget():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    try:
        month = int(data.get("month"))
        year = int(data.get("year"))
        limit_amount = float(data.get("limit_amount"))
        if not (1 <= month <= 12) or limit_amount <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"message": "Valid month, year and limit_amount are required"}), 400

    budget = Budget(
        user_id=user_id,
        category_id=data.get("category_id"),
        month=month,
        year=year,
        limit_amount=limit_amount,
    )
    db.session.add(budget)
    db.session.commit()
    return jsonify({"budget": budget.to_dict()}), 201


@budgets_bp.route("/<int:budget_id>", methods=["PUT"])
@jwt_required()
def update_budget(budget_id):
    user_id = int(get_jwt_identity())
    budget = Budget.query.filter_by(id=budget_id, user_id=user_id).first()
    if not budget:
        return jsonify({"message": "Budget not found"}), 404

    data = request.get_json(silent=True) or {}
    if "limit_amount" in data:
        budget.limit_amount = float(data["limit_amount"])
    if "category_id" in data:
        budget.category_id = data["category_id"]
    if "month" in data:
        budget.month = int(data["month"])
    if "year" in data:
        budget.year = int(data["year"])

    db.session.commit()
    return jsonify({"budget": budget.to_dict()}), 200


@budgets_bp.route("/<int:budget_id>", methods=["DELETE"])
@jwt_required()
def delete_budget(budget_id):
    user_id = int(get_jwt_identity())
    budget = Budget.query.filter_by(id=budget_id, user_id=user_id).first()
    if not budget:
        return jsonify({"message": "Budget not found"}), 404

    db.session.delete(budget)
    db.session.commit()
    return jsonify({"message": "Budget deleted"}), 200


@budgets_bp.route("/recommendations", methods=["GET"])
@jwt_required()
def budget_recommendations():
    """Suggest a budget per category based on the last 3 months' average spend."""
    user_id = int(get_jwt_identity())
    rows = (
        db.session.query(
            Transaction.category_id,
            func.avg(Transaction.amount).label("avg_amount"),
            func.count(Transaction.id).label("cnt"),
        )
        .filter(Transaction.user_id == user_id, Transaction.type == "expense")
        .group_by(Transaction.category_id)
        .all()
    )

    recommendations = []
    for category_id, avg_amount, cnt in rows:
        if category_id is None:
            continue
        recommendations.append(
            {
                "category_id": category_id,
                "suggested_monthly_limit": round(avg_amount * 1.1, 2),
                "based_on_transactions": cnt,
            }
        )

    return jsonify({"recommendations": recommendations}), 200

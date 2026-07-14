from datetime import date, timedelta
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import extract, func

from extensions import db
from models import Transaction, Category, Budget, Goal, Account

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/summary", methods=["GET"])
@jwt_required()
def summary():
    user_id = int(get_jwt_identity())
    today = date.today()
    month_start = date(today.year, today.month, 1)

    total_income = (
        Transaction.query.filter_by(user_id=user_id, type="income")
        .with_entities(func.sum(Transaction.amount))
        .scalar()
        or 0
    )
    total_expense = (
        Transaction.query.filter_by(user_id=user_id, type="expense")
        .with_entities(func.sum(Transaction.amount))
        .scalar()
        or 0
    )
    month_income = (
        Transaction.query.filter(
            Transaction.user_id == user_id, Transaction.type == "income", Transaction.date >= month_start
        )
        .with_entities(func.sum(Transaction.amount))
        .scalar()
        or 0
    )
    month_expense = (
        Transaction.query.filter(
            Transaction.user_id == user_id, Transaction.type == "expense", Transaction.date >= month_start
        )
        .with_entities(func.sum(Transaction.amount))
        .scalar()
        or 0
    )

    recent = (
        Transaction.query.filter_by(user_id=user_id)
        .order_by(Transaction.date.desc(), Transaction.created_at.desc())
        .limit(8)
        .all()
    )

    expense_by_category = (
        db.session.query(Category.name, func.sum(Transaction.amount))
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(Transaction.user_id == user_id, Transaction.type == "expense")
        .group_by(Category.name)
        .all()
    )

    monthly_trend = []
    year, month = today.year, today.month
    for _ in range(6):
        inc = (
            Transaction.query.filter(
                Transaction.user_id == user_id,
                Transaction.type == "income",
                extract("year", Transaction.date) == year,
                extract("month", Transaction.date) == month,
            )
            .with_entities(func.sum(Transaction.amount))
            .scalar()
            or 0
        )
        exp = (
            Transaction.query.filter(
                Transaction.user_id == user_id,
                Transaction.type == "expense",
                extract("year", Transaction.date) == year,
                extract("month", Transaction.date) == month,
            )
            .with_entities(func.sum(Transaction.amount))
            .scalar()
            or 0
        )
        monthly_trend.append({"year": year, "month": month, "income": inc, "expense": exp})
        month -= 1
        if month == 0:
            month, year = 12, year - 1
    monthly_trend.reverse()

    budgets = Budget.query.filter_by(user_id=user_id, month=today.month, year=today.year).all()
    budget_progress = []
    for b in budgets:
        spent = (
            Transaction.query.filter(
                Transaction.user_id == user_id,
                Transaction.type == "expense",
                Transaction.category_id == b.category_id,
                extract("month", Transaction.date) == b.month,
                extract("year", Transaction.date) == b.year,
            )
            .with_entities(func.sum(Transaction.amount))
            .scalar()
            or 0
        )
        budget_progress.append(
            {
                "category_name": b.category.name if b.category else "All Categories",
                "limit_amount": b.limit_amount,
                "spent": spent,
                "percent_used": round((spent / b.limit_amount) * 100, 1) if b.limit_amount else 0,
            }
        )

    goals = Goal.query.filter_by(user_id=user_id).order_by(Goal.created_at.desc()).limit(5).all()

    accounts = Account.query.filter_by(user_id=user_id).all()
    total_balance = sum(a.balance for a in accounts)

    # Financial health score (0-100): rewards positive savings rate and low overspending
    savings_rate = ((month_income - month_expense) / month_income) if month_income > 0 else 0
    overspend_penalty = sum(1 for b in budget_progress if b["percent_used"] > 100) * 10
    score = max(0, min(100, round(50 + savings_rate * 100 - overspend_penalty)))

    return jsonify(
        {
            "total_income": total_income,
            "total_expense": total_expense,
            "net_savings": total_income - total_expense,
            "month_income": month_income,
            "month_expense": month_expense,
            "month_cash_flow": month_income - month_expense,
            "total_balance": total_balance,
            "recent_transactions": [t.to_dict() for t in recent],
            "expense_by_category": [{"category": n, "amount": a} for n, a in expense_by_category],
            "monthly_trend": monthly_trend,
            "budget_progress": budget_progress,
            "goals": [g.to_dict() for g in goals],
            "financial_health_score": score,
        }
    ), 200

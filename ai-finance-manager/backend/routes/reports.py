import csv
import io
from datetime import date, timedelta

from flask import Blueprint, request, jsonify, Response, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import extract, func

from extensions import db
from models import Transaction, Category

reports_bp = Blueprint("reports", __name__)


def _range_for_period(period):
    today = date.today()
    if period == "weekly":
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
    elif period == "yearly":
        start = date(today.year, 1, 1)
        end = date(today.year, 12, 31)
    else:  # monthly
        start = date(today.year, today.month, 1)
        next_month = today.month % 12 + 1
        next_year = today.year + (1 if today.month == 12 else 0)
        end = date(next_year, next_month, 1) - timedelta(days=1)
    return start, end


def _summary(user_id, start, end):
    base = Transaction.query.filter(
        Transaction.user_id == user_id,
        Transaction.date >= start,
        Transaction.date <= end,
    )
    income = base.filter_by(type="income").with_entities(func.sum(Transaction.amount)).scalar() or 0
    expense = base.filter_by(type="expense").with_entities(func.sum(Transaction.amount)).scalar() or 0

    breakdown_rows = (
        db.session.query(Category.name, func.sum(Transaction.amount))
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(
            Transaction.user_id == user_id,
            Transaction.date >= start,
            Transaction.date <= end,
            Transaction.type == "expense",
        )
        .group_by(Category.name)
        .all()
    )
    income_rows = (
        db.session.query(Category.name, func.sum(Transaction.amount))
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(
            Transaction.user_id == user_id,
            Transaction.date >= start,
            Transaction.date <= end,
            Transaction.type == "income",
        )
        .group_by(Category.name)
        .all()
    )

    return {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "total_income": income,
        "total_expense": expense,
        "net_savings": income - expense,
        "expense_breakdown": [{"category": n, "amount": a} for n, a in breakdown_rows],
        "income_breakdown": [{"category": n, "amount": a} for n, a in income_rows],
    }


@reports_bp.route("/<period>", methods=["GET"])
@jwt_required()
def get_report(period):
    if period not in ("weekly", "monthly", "yearly"):
        return jsonify({"message": "Period must be weekly, monthly, or yearly"}), 400
    user_id = int(get_jwt_identity())
    start, end = _range_for_period(period)
    return jsonify(_summary(user_id, start, end)), 200


@reports_bp.route("/<period>/csv", methods=["GET"])
@jwt_required()
def export_csv(period):
    if period not in ("weekly", "monthly", "yearly"):
        return jsonify({"message": "Period must be weekly, monthly, or yearly"}), 400
    user_id = int(get_jwt_identity())
    start, end = _range_for_period(period)

    transactions = (
        Transaction.query.filter(
            Transaction.user_id == user_id,
            Transaction.date >= start,
            Transaction.date <= end,
        )
        .order_by(Transaction.date)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Type", "Category", "Amount", "Notes"])
    for t in transactions:
        writer.writerow(
            [t.date.isoformat(), t.type, t.category.name if t.category else "", t.amount, t.notes or ""]
        )

    response = Response(output.getvalue(), mimetype="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename={period}_report.csv"
    return response


@reports_bp.route("/<period>/pdf", methods=["GET"])
@jwt_required()
def export_pdf(period):
    if period not in ("weekly", "monthly", "yearly"):
        return jsonify({"message": "Period must be weekly, monthly, or yearly"}), 400
    user_id = int(get_jwt_identity())
    start, end = _range_for_period(period)
    summary = _summary(user_id, start, end)

    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    y = height - 60
    c.setFont("Helvetica-Bold", 18)
    c.drawString(50, y, f"{period.capitalize()} Financial Report")
    y -= 25
    c.setFont("Helvetica", 11)
    c.drawString(50, y, f"Period: {summary['start_date']} to {summary['end_date']}")
    y -= 30

    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, y, "Summary")
    y -= 20
    c.setFont("Helvetica", 11)
    c.drawString(50, y, f"Total Income: {summary['total_income']:.2f}")
    y -= 16
    c.drawString(50, y, f"Total Expense: {summary['total_expense']:.2f}")
    y -= 16
    c.drawString(50, y, f"Net Savings: {summary['net_savings']:.2f}")
    y -= 30

    c.setFont("Helvetica-Bold", 13)
    c.drawString(50, y, "Expense Breakdown")
    y -= 20
    c.setFont("Helvetica", 11)
    for row in summary["expense_breakdown"]:
        c.drawString(60, y, f"{row['category']}: {row['amount']:.2f}")
        y -= 16
        if y < 60:
            c.showPage()
            y = height - 60

    c.showPage()
    c.save()
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"{period}_report.pdf",
        mimetype="application/pdf",
    )

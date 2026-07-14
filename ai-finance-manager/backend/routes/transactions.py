from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Transaction, Account

transactions_bp = Blueprint("transactions", __name__)


def _parse_date(value):
    return datetime.strptime(value, "%Y-%m-%d").date()


def _apply_balance(account, tx_type, amount, reverse=False):
    if not account:
        return
    sign = 1 if tx_type == "income" else -1
    if reverse:
        sign *= -1
    account.balance += sign * amount


@transactions_bp.route("", methods=["GET"])
@jwt_required()
def list_transactions():
    user_id = int(get_jwt_identity())
    query = Transaction.query.filter_by(user_id=user_id)

    search = request.args.get("search")
    if search:
        query = query.filter(Transaction.notes.ilike(f"%{search}%"))

    tx_type = request.args.get("type")
    if tx_type in ("income", "expense"):
        query = query.filter_by(type=tx_type)

    category_id = request.args.get("category_id")
    if category_id:
        query = query.filter_by(category_id=int(category_id))

    account_id = request.args.get("account_id")
    if account_id:
        query = query.filter_by(account_id=int(account_id))

    date_from = request.args.get("date_from")
    if date_from:
        query = query.filter(Transaction.date >= _parse_date(date_from))

    date_to = request.args.get("date_to")
    if date_to:
        query = query.filter(Transaction.date <= _parse_date(date_to))

    sort_by = request.args.get("sort_by", "date")
    sort_dir = request.args.get("sort_dir", "desc")
    sort_column = {
        "date": Transaction.date,
        "amount": Transaction.amount,
        "created_at": Transaction.created_at,
    }.get(sort_by, Transaction.date)
    query = query.order_by(sort_column.desc() if sort_dir == "desc" else sort_column.asc())

    page = int(request.args.get("page", 1))
    per_page = min(int(request.args.get("per_page", 10)), 100)
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify(
        {
            "transactions": [t.to_dict() for t in paginated.items],
            "total": paginated.total,
            "page": page,
            "per_page": per_page,
            "pages": paginated.pages,
        }
    ), 200


@transactions_bp.route("", methods=["POST"])
@jwt_required()
def create_transaction():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    tx_type = data.get("type")
    amount = data.get("amount")
    date_str = data.get("date")

    if tx_type not in ("income", "expense"):
        return jsonify({"message": "Type must be income or expense"}), 400
    try:
        amount = float(amount)
        if amount <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"message": "Amount must be a positive number"}), 400
    try:
        tx_date = _parse_date(date_str)
    except (TypeError, ValueError):
        return jsonify({"message": "Date must be in YYYY-MM-DD format"}), 400

    account = None
    if data.get("account_id"):
        account = Account.query.filter_by(id=data["account_id"], user_id=user_id).first()
        if not account:
            return jsonify({"message": "Account not found"}), 404

    transaction = Transaction(
        user_id=user_id,
        account_id=account.id if account else None,
        category_id=data.get("category_id"),
        type=tx_type,
        amount=amount,
        date=tx_date,
        notes=(data.get("notes") or "").strip(),
    )
    db.session.add(transaction)

    _apply_balance(account, tx_type, amount)

    db.session.commit()
    return jsonify({"transaction": transaction.to_dict()}), 201


@transactions_bp.route("/<int:tx_id>", methods=["PUT"])
@jwt_required()
def update_transaction(tx_id):
    user_id = int(get_jwt_identity())
    transaction = Transaction.query.filter_by(id=tx_id, user_id=user_id).first()
    if not transaction:
        return jsonify({"message": "Transaction not found"}), 404

    data = request.get_json(silent=True) or {}
    old_account = Account.query.get(transaction.account_id) if transaction.account_id else None
    _apply_balance(old_account, transaction.type, transaction.amount, reverse=True)

    if "type" in data and data["type"] in ("income", "expense"):
        transaction.type = data["type"]
    if "amount" in data:
        try:
            transaction.amount = float(data["amount"])
        except (TypeError, ValueError):
            return jsonify({"message": "Amount must be a number"}), 400
    if "date" in data:
        try:
            transaction.date = _parse_date(data["date"])
        except (TypeError, ValueError):
            return jsonify({"message": "Date must be in YYYY-MM-DD format"}), 400
    if "notes" in data:
        transaction.notes = data["notes"]
    if "category_id" in data:
        transaction.category_id = data["category_id"]
    if "account_id" in data:
        transaction.account_id = data["account_id"]

    new_account = Account.query.get(transaction.account_id) if transaction.account_id else None
    _apply_balance(new_account, transaction.type, transaction.amount)

    db.session.commit()
    return jsonify({"transaction": transaction.to_dict()}), 200


@transactions_bp.route("/<int:tx_id>", methods=["DELETE"])
@jwt_required()
def delete_transaction(tx_id):
    user_id = int(get_jwt_identity())
    transaction = Transaction.query.filter_by(id=tx_id, user_id=user_id).first()
    if not transaction:
        return jsonify({"message": "Transaction not found"}), 404

    account = Account.query.get(transaction.account_id) if transaction.account_id else None
    _apply_balance(account, transaction.type, transaction.amount, reverse=True)

    db.session.delete(transaction)
    db.session.commit()
    return jsonify({"message": "Transaction deleted"}), 200

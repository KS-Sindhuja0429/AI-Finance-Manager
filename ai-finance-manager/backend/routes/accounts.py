from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Account, Transaction

accounts_bp = Blueprint("accounts", __name__)

VALID_TYPES = ("cash", "bank", "credit_card", "wallet")


@accounts_bp.route("", methods=["GET"])
@jwt_required()
def list_accounts():
    user_id = int(get_jwt_identity())
    accounts = Account.query.filter_by(user_id=user_id).order_by(Account.created_at).all()
    return jsonify({"accounts": [a.to_dict() for a in accounts]}), 200


@accounts_bp.route("", methods=["POST"])
@jwt_required()
def create_account():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    acc_type = data.get("type", "cash")

    if not name:
        return jsonify({"message": "Account name is required"}), 400
    if acc_type not in VALID_TYPES:
        return jsonify({"message": f"Type must be one of {VALID_TYPES}"}), 400

    account = Account(
        user_id=user_id,
        name=name,
        type=acc_type,
        balance=float(data.get("balance", 0) or 0),
    )
    db.session.add(account)
    db.session.commit()
    return jsonify({"account": account.to_dict()}), 201


@accounts_bp.route("/<int:account_id>", methods=["PUT"])
@jwt_required()
def update_account(account_id):
    user_id = int(get_jwt_identity())
    account = Account.query.filter_by(id=account_id, user_id=user_id).first()
    if not account:
        return jsonify({"message": "Account not found"}), 404

    data = request.get_json(silent=True) or {}
    if "name" in data and data["name"].strip():
        account.name = data["name"].strip()
    if "type" in data and data["type"] in VALID_TYPES:
        account.type = data["type"]
    if "balance" in data:
        account.balance = float(data["balance"])

    db.session.commit()
    return jsonify({"account": account.to_dict()}), 200


@accounts_bp.route("/<int:account_id>", methods=["DELETE"])
@jwt_required()
def delete_account(account_id):
    user_id = int(get_jwt_identity())
    account = Account.query.filter_by(id=account_id, user_id=user_id).first()
    if not account:
        return jsonify({"message": "Account not found"}), 404

    Transaction.query.filter_by(account_id=account.id, user_id=user_id).update(
        {"account_id": None}
    )
    db.session.delete(account)
    db.session.commit()
    return jsonify({"message": "Account deleted"}), 200

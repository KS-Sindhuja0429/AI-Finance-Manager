from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import User

settings_bp = Blueprint("settings", __name__)

CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "AUD", "CAD"]


@settings_bp.route("", methods=["GET"])
@jwt_required()
def get_settings():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify(
        {
            "theme": user.theme,
            "currency": user.currency,
            "notifications_enabled": user.notifications_enabled,
            "available_currencies": CURRENCIES,
        }
    ), 200


@settings_bp.route("", methods=["PUT"])
@jwt_required()
def update_settings():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"message": "User not found"}), 404

    data = request.get_json(silent=True) or {}
    if "theme" in data and data["theme"] in ("dark", "light"):
        user.theme = data["theme"]
    if "currency" in data and data["currency"] in CURRENCIES:
        user.currency = data["currency"]
    if "notifications_enabled" in data:
        user.notifications_enabled = bool(data["notifications_enabled"])

    db.session.commit()
    return jsonify(
        {
            "theme": user.theme,
            "currency": user.currency,
            "notifications_enabled": user.notifications_enabled,
        }
    ), 200

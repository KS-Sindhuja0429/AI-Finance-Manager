from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
from extensions import db
from models import User, Category

auth_bp = Blueprint("auth", __name__)

DEFAULT_CATEGORIES = [
    ("Food", "expense", "FaUtensils", "#f97316"),
    ("Travel", "expense", "FaPlane", "#0ea5e9"),
    ("Shopping", "expense", "FaShoppingBag", "#ec4899"),
    ("Bills", "expense", "FaFileInvoiceDollar", "#ef4444"),
    ("Entertainment", "expense", "FaFilm", "#a855f7"),
    ("Education", "expense", "FaGraduationCap", "#14b8a6"),
    ("Healthcare", "expense", "FaHeartbeat", "#f43f5e"),
    ("Others", "expense", "FaEllipsisH", "#64748b"),
    ("Salary", "income", "FaMoneyBillWave", "#22c55e"),
    ("Investment", "income", "FaChartLine", "#10b981"),
]


def _validate_email(email):
    return isinstance(email, str) and "@" in email and "." in email


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return jsonify({"message": "Name, email and password are required"}), 400
    if not _validate_email(email):
        return jsonify({"message": "Invalid email address"}), 400
    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "An account with this email already exists"}), 409

    user = User(name=name, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    for cat_name, cat_type, icon, color in DEFAULT_CATEGORIES:
        db.session.add(
            Category(
                user_id=user.id,
                name=cat_name,
                type=cat_type,
                icon=icon,
                color=color,
                is_default=True,
            )
        )

    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid email or password"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"user": user.to_dict()}), 200


@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"message": "User not found"}), 404

    data = request.get_json(silent=True) or {}
    if "name" in data and data["name"].strip():
        user.name = data["name"].strip()
    if "currency" in data:
        user.currency = data["currency"]

    db.session.commit()
    return jsonify({"user": user.to_dict()}), 200


@auth_bp.route("/change-password", methods=["PUT"])
@jwt_required()
def change_password():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"message": "User not found"}), 404

    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""

    if not user.check_password(current_password):
        return jsonify({"message": "Current password is incorrect"}), 400
    if len(new_password) < 6:
        return jsonify({"message": "New password must be at least 6 characters"}), 400

    user.set_password(new_password)
    db.session.commit()
    return jsonify({"message": "Password updated successfully"}), 200

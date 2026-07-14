from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Category, Transaction

categories_bp = Blueprint("categories", __name__)


@categories_bp.route("", methods=["GET"])
@jwt_required()
def list_categories():
    user_id = int(get_jwt_identity())
    categories = Category.query.filter_by(user_id=user_id).order_by(Category.name).all()
    return jsonify({"categories": [c.to_dict() for c in categories]}), 200


@categories_bp.route("", methods=["POST"])
@jwt_required()
def create_category():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    cat_type = data.get("type", "expense")

    if not name:
        return jsonify({"message": "Category name is required"}), 400
    if cat_type not in ("income", "expense"):
        return jsonify({"message": "Type must be income or expense"}), 400

    category = Category(
        user_id=user_id,
        name=name,
        type=cat_type,
        icon=data.get("icon", "FaTag"),
        color=data.get("color", "#6366f1"),
    )
    db.session.add(category)
    db.session.commit()
    return jsonify({"category": category.to_dict()}), 201


@categories_bp.route("/<int:category_id>", methods=["PUT"])
@jwt_required()
def update_category(category_id):
    user_id = int(get_jwt_identity())
    category = Category.query.filter_by(id=category_id, user_id=user_id).first()
    if not category:
        return jsonify({"message": "Category not found"}), 404

    data = request.get_json(silent=True) or {}
    if "name" in data and data["name"].strip():
        category.name = data["name"].strip()
    if "type" in data and data["type"] in ("income", "expense"):
        category.type = data["type"]
    if "icon" in data:
        category.icon = data["icon"]
    if "color" in data:
        category.color = data["color"]

    db.session.commit()
    return jsonify({"category": category.to_dict()}), 200


@categories_bp.route("/<int:category_id>", methods=["DELETE"])
@jwt_required()
def delete_category(category_id):
    user_id = int(get_jwt_identity())
    category = Category.query.filter_by(id=category_id, user_id=user_id).first()
    if not category:
        return jsonify({"message": "Category not found"}), 404

    Transaction.query.filter_by(category_id=category.id, user_id=user_id).update(
        {"category_id": None}
    )
    db.session.delete(category)
    db.session.commit()
    return jsonify({"message": "Category deleted"}), 200

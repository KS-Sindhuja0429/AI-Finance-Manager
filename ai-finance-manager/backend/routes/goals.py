from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Goal

goals_bp = Blueprint("goals", __name__)


@goals_bp.route("", methods=["GET"])
@jwt_required()
def list_goals():
    user_id = int(get_jwt_identity())
    goals = Goal.query.filter_by(user_id=user_id).order_by(Goal.created_at.desc()).all()
    return jsonify({"goals": [g.to_dict() for g in goals]}), 200


@goals_bp.route("", methods=["POST"])
@jwt_required()
def create_goal():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()
    try:
        target_amount = float(data.get("target_amount"))
        if target_amount <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"message": "Valid target_amount is required"}), 400
    if not name:
        return jsonify({"message": "Goal name is required"}), 400

    deadline = None
    if data.get("deadline"):
        try:
            deadline = datetime.strptime(data["deadline"], "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"message": "Deadline must be in YYYY-MM-DD format"}), 400

    goal = Goal(
        user_id=user_id,
        name=name,
        target_amount=target_amount,
        current_amount=float(data.get("current_amount", 0) or 0),
        deadline=deadline,
    )
    db.session.add(goal)
    db.session.commit()
    return jsonify({"goal": goal.to_dict()}), 201


@goals_bp.route("/<int:goal_id>", methods=["PUT"])
@jwt_required()
def update_goal(goal_id):
    user_id = int(get_jwt_identity())
    goal = Goal.query.filter_by(id=goal_id, user_id=user_id).first()
    if not goal:
        return jsonify({"message": "Goal not found"}), 404

    data = request.get_json(silent=True) or {}
    if "name" in data and data["name"].strip():
        goal.name = data["name"].strip()
    if "target_amount" in data:
        goal.target_amount = float(data["target_amount"])
    if "current_amount" in data:
        goal.current_amount = float(data["current_amount"])
    if "deadline" in data:
        goal.deadline = (
            datetime.strptime(data["deadline"], "%Y-%m-%d").date() if data["deadline"] else None
        )

    db.session.commit()
    return jsonify({"goal": goal.to_dict()}), 200


@goals_bp.route("/<int:goal_id>/contribute", methods=["POST"])
@jwt_required()
def contribute_goal(goal_id):
    user_id = int(get_jwt_identity())
    goal = Goal.query.filter_by(id=goal_id, user_id=user_id).first()
    if not goal:
        return jsonify({"message": "Goal not found"}), 404

    data = request.get_json(silent=True) or {}
    try:
        amount = float(data.get("amount"))
    except (TypeError, ValueError):
        return jsonify({"message": "Valid amount is required"}), 400

    goal.current_amount = max(0, goal.current_amount + amount)
    db.session.commit()
    return jsonify({"goal": goal.to_dict()}), 200


@goals_bp.route("/<int:goal_id>", methods=["DELETE"])
@jwt_required()
def delete_goal(goal_id):
    user_id = int(get_jwt_identity())
    goal = Goal.query.filter_by(id=goal_id, user_id=user_id).first()
    if not goal:
        return jsonify({"message": "Goal not found"}), 404

    db.session.delete(goal)
    db.session.commit()
    return jsonify({"message": "Goal deleted"}), 200

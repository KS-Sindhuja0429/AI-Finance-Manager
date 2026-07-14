from datetime import date, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from extensions import db
from models import Transaction, Category, Budget, Goal, AIChat, User

ai_bp = Blueprint("ai_assistant", __name__)


def _build_financial_context(user_id):
    today = date.today()
    month_start = date(today.year, today.month, 1)

    income = (
        Transaction.query.filter(
            Transaction.user_id == user_id, Transaction.type == "income", Transaction.date >= month_start
        )
        .with_entities(func.sum(Transaction.amount))
        .scalar()
        or 0
    )
    expense = (
        Transaction.query.filter(
            Transaction.user_id == user_id, Transaction.type == "expense", Transaction.date >= month_start
        )
        .with_entities(func.sum(Transaction.amount))
        .scalar()
        or 0
    )

    top_categories = (
        db.session.query(Category.name, func.sum(Transaction.amount).label("total"))
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(
            Transaction.user_id == user_id,
            Transaction.type == "expense",
            Transaction.date >= month_start,
        )
        .group_by(Category.name)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(5)
        .all()
    )

    budgets = Budget.query.filter_by(user_id=user_id, month=today.month, year=today.year).all()
    goals = Goal.query.filter_by(user_id=user_id).all()

    lines = [
        f"This month's income so far: {income:.2f}",
        f"This month's expenses so far: {expense:.2f}",
        f"Net so far this month: {income - expense:.2f}",
        "Top spending categories this month: "
        + (", ".join(f"{name} ({total:.2f})" for name, total in top_categories) or "none recorded"),
        "Active budgets: "
        + (
            ", ".join(f"limit {b.limit_amount:.2f}" for b in budgets)
            or "no budgets set for this month"
        ),
        "Savings goals: "
        + (
            ", ".join(
                f"{g.name} ({g.current_amount:.0f}/{g.target_amount:.0f})" for g in goals
            )
            or "no goals set"
        ),
    ]
    return "\n".join(lines)


PLACEHOLDER_KEYS = {"", "your-gemini-api-key-here", "your_gemini_api_key_here"}


def _call_gemini(system_context, user_message, history):
    api_key = (current_app.config.get("GEMINI_API_KEY") or "").strip()
    if api_key in PLACEHOLDER_KEYS:
        return (
            "The AI assistant isn't configured yet — add a real GEMINI_API_KEY to the backend "
            ".env file to enable live financial advice. In the meantime, based on your data: "
            + system_context
        )

    from google import genai
    from google.genai import types

    # http_options timeout (ms) prevents the request from ever hanging indefinitely
    # (e.g. if the key is invalid, the model name is wrong, or the network is unreachable).
    client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=15000))

    chat_history = [
        types.Content(
            role="user" if h.role == "user" else "model",
            parts=[types.Part(text=h.message)],
        )
        for h in history
    ]

    chat = client.chats.create(
        model=current_app.config.get("GEMINI_MODEL", "gemini-2.5-flash"),
        config=types.GenerateContentConfig(
            system_instruction=(
                "You are a helpful, encouraging personal finance assistant embedded in a "
                "finance tracking app. Use the user's real financial context to give concise, "
                "specific, actionable advice. Keep answers under 200 words unless asked for "
                "detail. Never invent numbers that weren't given to you.\n\n"
                "User's financial context:\n" + system_context
            ),
        ),
        history=chat_history,
    )
    response = chat.send_message(user_message)
    return response.text



@ai_bp.route("/chat", methods=["POST"])
@jwt_required()
def chat():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return jsonify({"message": "Message is required"}), 400

    history = (
        AIChat.query.filter_by(user_id=user_id)
        .order_by(AIChat.created_at.desc())
        .limit(20)
        .all()
    )
    history = list(reversed(history))

    context = _build_financial_context(user_id)

    try:
        reply_text = _call_gemini(context, message, history)
    except Exception as exc:  # noqa: BLE001
        reply_text = (
            "I ran into an issue reaching the AI service, so here's a quick data-based summary "
            f"instead:\n{context}\n\n(Technical detail: {exc})"
        )

    user_msg = AIChat(user_id=user_id, role="user", message=message)
    assistant_msg = AIChat(user_id=user_id, role="assistant", message=reply_text)
    db.session.add_all([user_msg, assistant_msg])
    db.session.commit()

    return jsonify({"reply": assistant_msg.to_dict()}), 200


@ai_bp.route("/chat/history", methods=["GET"])
@jwt_required()
def chat_history():
    user_id = int(get_jwt_identity())
    history = AIChat.query.filter_by(user_id=user_id).order_by(AIChat.created_at).all()
    return jsonify({"history": [h.to_dict() for h in history]}), 200


@ai_bp.route("/chat/history", methods=["DELETE"])
@jwt_required()
def clear_history():
    user_id = int(get_jwt_identity())
    AIChat.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({"message": "Chat history cleared"}), 200


@ai_bp.route("/summary", methods=["GET"])
@jwt_required()
def monthly_summary():
    """One-shot AI-generated monthly financial summary."""
    user_id = int(get_jwt_identity())
    context = _build_financial_context(user_id)
    try:
        reply_text = _call_gemini(
            context,
            "Give me a short summary of my finances this month with one actionable tip.",
            [],
        )
    except Exception as exc:  # noqa: BLE001
        reply_text = f"{context}\n\n(AI summary unavailable: {exc})"

    return jsonify({"summary": reply_text}), 200

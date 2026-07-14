from flask import Flask, jsonify

from config import Config
from extensions import db, jwt, bcrypt, cors

from routes.auth import auth_bp
from routes.transactions import transactions_bp
from routes.categories import categories_bp
from routes.accounts import accounts_bp
from routes.budgets import budgets_bp
from routes.goals import goals_bp
from routes.reports import reports_bp
from routes.forecast import forecast_bp
from routes.neural_forecast import neural_bp
from routes.anomaly_detection import anomaly_bp
from routes.ai_assistant import ai_bp
from routes.settings import settings_bp
from routes.dashboard import dashboard_bp


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["FRONTEND_ORIGIN"]}},
        supports_credentials=True,
    )

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(transactions_bp, url_prefix="/api/transactions")
    app.register_blueprint(categories_bp, url_prefix="/api/categories")
    app.register_blueprint(accounts_bp, url_prefix="/api/accounts")
    app.register_blueprint(budgets_bp, url_prefix="/api/budgets")
    app.register_blueprint(goals_bp, url_prefix="/api/goals")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(forecast_bp, url_prefix="/api/forecast")
    app.register_blueprint(neural_bp, url_prefix="/api/ml")
    app.register_blueprint(anomaly_bp, url_prefix="/api/ml")
    app.register_blueprint(ai_bp, url_prefix="/api/ai")
    app.register_blueprint(settings_bp, url_prefix="/api/settings")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")

    @app.route("/", methods=["GET"])
    def home():
        return jsonify({
        "message": "AI Finance Manager Backend is running 🚀",
        "health": "/api/health"
        }), 200
    
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok"}), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"message": "Resource not found"}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"message": "Internal server error"}), 500

    with app.app_context():
        db.create_all()

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)

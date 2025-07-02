from flask import Blueprint, request, jsonify
from db import db, UserProfile
from services.auth_utils import get_jwt_email

user_data_bp = Blueprint("user_data", __name__)

@user_data_bp.route("/api/user-data", methods=["GET"])
def get_user_data():
    email = get_jwt_email()
    if not email:
        return jsonify({"error": "Unauthorized"}), 401

    profile = UserProfile.query.filter_by(email=email).first()
    if not profile:
        return jsonify({"profile": None, "watchlist": []})
    
    return jsonify({
        "profile": profile.investor_profile,
        "watchlist": profile.watchlist_symbols or []
    })

@user_data_bp.route("/api/user-data", methods=["POST"])
def update_user_data():
    email = get_jwt_email()
    if not email:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    theme = data.get("theme")

    investor_profile = data.get("profile")
    incoming_watchlist = data.get("watchlist") or []

    existing_profile = UserProfile.query.filter_by(email=email).first()
    existing_watchlist = existing_profile.watchlist_symbols if existing_profile else []

    merged_watchlist = list(set((existing_watchlist or []) + incoming_watchlist))

    try:
        merged_profile = UserProfile(
            email=email,
            investor_profile=investor_profile,
            watchlist_symbols=merged_watchlist,
            theme=theme or existing_profile.theme if existing_profile else None
        )
        db.session.merge(merged_profile)

        db.session.flush()

        db.session.commit()
    except Exception as e:
        print("[user_data] DB error during save:", e)
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

    return jsonify({"success": True})
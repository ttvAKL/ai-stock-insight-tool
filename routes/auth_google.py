# backend/routes/auth_google.py
from flask import Blueprint, redirect, url_for, session
from authlib.integrations.flask_client import OAuth
from dotenv import load_dotenv
import os
from services.auth_utils import generate_jwt_token
from db import UserProfile

load_dotenv()
auth_bp = Blueprint("auth", __name__)
oauth = OAuth()

def register_oauth(app):
    oauth.init_app(app)
    oauth.register(
        name='google',
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        userinfo_endpoint="https://openidconnect.googleapis.com/v1/userinfo",
        client_kwargs={"scope": "openid email profile"},
    )

@auth_bp.route('/auth/google')
def login():
    print('def login hit!')
    redirect_uri = url_for('auth.auth_callback', _external=True)
    return oauth.google.authorize_redirect(redirect_uri)

@auth_bp.route('/auth/google/callback')
def auth_callback():
    try:
        token = oauth.google.authorize_access_token()
        resp = oauth.google.get('https://openidconnect.googleapis.com/v1/userinfo')
        user_info = resp.json()
        session["user"] = user_info

        jwt_token = generate_jwt_token(user_info)
        existing_profile = UserProfile.query.filter_by(email=user_info["email"]).first()
        if existing_profile:
            return redirect(f"http://localhost:5173/?token={jwt_token}")
        else:
            return redirect(f"http://localhost:5173/profile?token={jwt_token}")
    except Exception as e:
        print(f"[OAuth Error] {e}")
        return "Authentication failed", 500
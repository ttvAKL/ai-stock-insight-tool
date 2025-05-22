from datetime import datetime, timedelta
import os
import jwt
from dotenv import load_dotenv
from flask import request

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

def get_jwt_email():
    auth_header = request.headers.get("Authorization", None)
    if not auth_header:
        return None
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    token = parts[1]
    if not token:
        print("[user_data] Warning: JWT token is empty or malformed")
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("email")
    except jwt.InvalidTokenError as e:
        print(f"[user_data] JWT decode error: {e}")
        return None
    
def generate_jwt_token(user_info):
    payload = {
        "email": user_info.get("email"),
        "name": user_info.get("name"),
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token.decode("utf-8") if isinstance(token, bytes) else token
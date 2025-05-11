

import os
import jwt
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

def verify_jwt_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("user_id")  # or any identifying field you expect
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
        print(f"[JWT] Invalid token: {e}")
        return False
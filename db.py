from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os

load_dotenv()

db = SQLAlchemy()

class UserProfile(db.Model):
    __tablename__ = 'user_profiles'

    email = db.Column(db.String(120), primary_key=True)
    investor_profile = db.Column(db.JSON, nullable=True)
    watchlist_symbols = db.Column(db.JSON, nullable=True)
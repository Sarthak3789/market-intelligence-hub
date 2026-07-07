from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    is_verified = Column(Boolean, default=False)
    verification_code = Column(String, nullable=True)

class PortfolioItem(Base):
    __tablename__ = "portfolio_items"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    ticker = Column(String, index=True)
    shares = Column(Float, default=0.0)
    buy_price = Column(Float, default=0.0)

class SentimentLog(Base):
    __tablename__ = "sentiment_logs"
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, index=True)
    headline = Column(String)
    sentiment = Column(String)  # 'Positive', 'Negative', 'Neutral'
    score = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

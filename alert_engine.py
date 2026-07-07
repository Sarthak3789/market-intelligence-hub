import os
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv
from database import SessionLocal
import models
from scraper import fetch_financial_news, get_live_price
from ml_engine import predict_sentiment

load_dotenv()

def send_alert(user_email, ticker, current_price, sentiment):
    # Simulated email logging
    mock_email = f"""
================ EMAIL ALERT ================
TO: {user_email}
SUBJECT: ⚠️ NEGATIVE SENTIMENT SPIKE: {ticker}

Alert! The AI Engine has detected a surge in NEGATIVE 
sentiment for your holding: {ticker}.

Current Market Price: ${current_price:.2f}

Consider reviewing your portfolio positions.
=============================================
"""
    
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    
    if smtp_server and smtp_user and smtp_pass:
        try:
            msg = MIMEText(mock_email)
            msg['Subject'] = f"Alert: {ticker} Sentiment Negative"
            msg['From'] = smtp_user
            msg['To'] = user_email
            with smtplib.SMTP_SSL(smtp_server, int(smtp_port or 465)) as server:
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            print(f"Real email sent to {user_email} for {ticker}")
        except Exception as e:
            print(f"Failed to send real email: {e}")
            _write_mock_inbox(mock_email)
    else:
        # Fallback to simulation
        _write_mock_inbox(mock_email)
        print(mock_email)

def send_verification_email(user_email, code):
    mock_email = f"""
================ EMAIL VERIFICATION ================
TO: {user_email}
SUBJECT: Your MarketIntel Verification Code

Welcome to the Market Intelligence Platform! 
Your 6-digit verification code is: {code}

Please enter this code in the app to activate your account.
====================================================
"""
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")

    if not smtp_pass or smtp_pass == "your_app_password":
        _write_mock_inbox(mock_email)
        print(mock_email)
    else:
        try:
            msg = MIMEText(mock_email)
            msg['Subject'] = "Your MarketIntel Verification Code"
            msg['From'] = smtp_user
            msg['To'] = user_email
            with smtplib.SMTP_SSL(smtp_server, int(smtp_port or 465)) as server:
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            print(f"Verification email sent to {user_email}")
        except Exception as e:
            print(f"Failed to send verification email: {e}")
            _write_mock_inbox(mock_email)

def _write_mock_inbox(content):
    print(content)
    with open("mock_inbox.txt", "a") as f:
        f.write(content + "\n")

def run_sentiment_check():
    print("Running background AI portfolio sentiment check...")
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        for user in users:
            items = db.query(models.PortfolioItem).filter(models.PortfolioItem.user_id == user.id).all()
            for item in items:
                headlines = fetch_financial_news(item.ticker)
                if not headlines: continue
                sentiments = [predict_sentiment(h['headline']) for h in headlines]
                if sentiments:
                    overall = max(set(sentiments), key=sentiments.count)
                    if overall == "Negative":
                        price = get_live_price(item.ticker)
                        send_alert(user.email, item.ticker, price, overall)
    finally:
        db.close()

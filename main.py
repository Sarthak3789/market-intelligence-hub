from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import database
import models
from scraper import fetch_financial_news, get_live_price
from ml_engine import predict_sentiment
from collections import defaultdict
from apscheduler.schedulers.background import BackgroundScheduler
from alert_engine import run_sentiment_check, send_verification_email
import random
from auth import get_password_hash, verify_password, create_access_token, get_current_user
import asyncio
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
import database
import models
from scraper import fetch_financial_news, get_live_price
from ml_engine import predict_sentiment
from collections import defaultdict
from apscheduler.schedulers.background import BackgroundScheduler
from alert_engine import run_sentiment_check

# Create DB tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Market Intelligence Hub")

@app.on_event("startup")
def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(run_sentiment_check, 'interval', minutes=60)
    scheduler.start()
app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")
class UserSignup(BaseModel):
    email: str
    username: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserVerify(BaseModel):
    email: str
    code: str

class PortfolioAdd(BaseModel):
    ticker: str
    shares: float = 0.0
    buy_price: float = 0.0

@app.get("/")
def read_root():
    return FileResponse("static/index.html")

@app.post("/signup")
def signup(user: UserSignup, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter((models.User.email == user.email) | (models.User.username == user.username)).first()
    if db_user:
        if not db_user.is_verified and db_user.email == user.email:
            code = str(random.randint(100000, 999999))
            db_user.verification_code = code
            db_user.password = get_password_hash(user.password)
            db.commit()
            send_verification_email(user.email, code)
            return {"requires_verification": True, "email": user.email}
        raise HTTPException(status_code=400, detail="Email or Username already registered")
    
    code = str(random.randint(100000, 999999))
    hashed_pwd = get_password_hash(user.password)
    new_user = models.User(email=user.email, username=user.username, password=hashed_pwd, verification_code=code, is_verified=False)
    db.add(new_user)
    db.commit()
    send_verification_email(user.email, code)
    return {"requires_verification": True, "email": user.email}

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not db_user.is_verified:
        raise HTTPException(status_code=403, detail="unverified")
    access_token = create_access_token(data={"sub": str(db_user.id)})
    return {"access_token": access_token, "token_type": "bearer", "user": {"id": db_user.id, "username": db_user.username, "email": db_user.email}}

@app.post("/verify")
def verify(data: UserVerify, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="User already verified")
    if user.verification_code != data.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
        
    user.is_verified = True
    user.verification_code = None
    db.commit()
    
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer", "user": {"id": user.id, "username": user.username, "email": user.email}}

@app.post("/portfolio/add")
def add_to_portfolio(portfolio: PortfolioAdd, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    user_id = current_user.id

    ticker_upper = portfolio.ticker.upper()
    existing_item = db.query(models.PortfolioItem).filter(
        models.PortfolioItem.user_id == user_id, 
        models.PortfolioItem.ticker == ticker_upper
    ).first()

    if existing_item:
        if portfolio.shares > 0:
            total_shares = existing_item.shares + portfolio.shares
            total_cost = (existing_item.shares * existing_item.buy_price) + (portfolio.shares * portfolio.buy_price)
            existing_item.buy_price = total_cost / total_shares if total_shares > 0 else 0
            existing_item.shares = total_shares
        db.commit()
        return {"message": f"Updated {ticker_upper} position"}
    else:
        item = models.PortfolioItem(
            user_id=user_id, 
            ticker=ticker_upper,
            shares=portfolio.shares,
            buy_price=portfolio.buy_price
        )
        db.add(item)
        db.commit()
        return {"message": f"Added {ticker_upper} to portfolio"}

@app.get("/portfolio/sentiment")
async def get_portfolio_sentiment(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    user_id = current_user.id
    items = db.query(models.PortfolioItem).filter(models.PortfolioItem.user_id == user_id).all()
    if not items:
        return {"message": "Portfolio is empty"}
    
    from fastapi.concurrency import run_in_threadpool
    import asyncio
    
    async def process_item(item):
        headlines = await run_in_threadpool(fetch_financial_news, item.ticker)
        sentiment_scores = []
        details = []
        
        for h in headlines:
            sentiment = await run_in_threadpool(predict_sentiment, h['headline'])
            sentiment_scores.append(sentiment)
            details.append({"headline": h['headline'], "sentiment": sentiment, "link": h['link']})
            
        overall = "Neutral"
        if sentiment_scores:
            overall = max(set(sentiment_scores), key=sentiment_scores.count)
            
        current_price = await run_in_threadpool(get_live_price, item.ticker)
        
        return {
            "ticker": item.ticker,
            "data": {
                "headlines_analyzed": len(headlines),
                "overall_sentiment": overall,
                "details": details,
                "current_price": current_price
            }
        }

    tasks = [process_item(item) for item in items]
    results_list = await asyncio.gather(*tasks)
    
    results = {}
    for res_dict in results_list:
        ticker = res_dict["ticker"]
        data = res_dict["data"]
        results[ticker] = data
        
        # Safely log to DB on the main async thread to avoid thread collisions
        for detail in data["details"]:
            log = models.SentimentLog(ticker=ticker, headline=detail['headline'], sentiment=detail['sentiment'], score=1.0)
            db.add(log)
    
    db.commit()
    return results

@app.get("/portfolio/history")
def get_portfolio_history(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    user_id = current_user.id
    items = db.query(models.PortfolioItem).filter(models.PortfolioItem.user_id == user_id).all()
    if not items:
        return []
    tickers = [i.ticker for i in items]
    
    logs = db.query(models.SentimentLog).filter(models.SentimentLog.ticker.in_(tickers)).order_by(models.SentimentLog.timestamp).all()
    
    # history_data will be a dict of time_key -> dict of ticker -> score
    history_dict = defaultdict(lambda: defaultdict(list))
    
    for log in logs:
        if not log.timestamp: continue
        time_key = log.timestamp.strftime("%H:%M:%S")
        score_val = 0
        if log.sentiment == "Positive": score_val = 1
        elif log.sentiment == "Negative": score_val = -1
        
        history_dict[time_key][log.ticker].append(score_val)
        
    chart_data = []
    for t_key, ticker_scores in history_dict.items():
        data_point = {"time": t_key}
        for ticker, scores in ticker_scores.items():
            data_point[ticker] = sum(scores) / len(scores)
        chart_data.append(data_point)
        
    return chart_data

@app.get("/live_prices")
def get_live_prices_http(tickers: str):
    from scraper import get_live_price
    ticker_list = tickers.split(",")
    return [{"ticker": t, "price": get_live_price(t)} for t in ticker_list]

# WebSocket manager
active_connections = []

@app.websocket("/ws/live_prices")
async def websocket_live_prices(websocket: WebSocket, tickers: str):
    await websocket.accept()
    active_connections.append(websocket)
    from scraper import get_live_price
    ticker_list = tickers.split(",")
    try:
        while True:
            data = [{"ticker": t, "price": get_live_price(t)} for t in ticker_list]
            await websocket.send_json(data)
            await asyncio.sleep(5)  # Push every 5 seconds
    except WebSocketDisconnect:
        active_connections.remove(websocket)

@app.get("/portfolio/history_price/{ticker}")
def get_history_price(ticker: str):
    from scraper import get_historical_prices
    return get_historical_prices(ticker)

@app.get("/portfolio")
def get_portfolio(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    user_id = current_user.id
    items = db.query(models.PortfolioItem).filter(models.PortfolioItem.user_id == user_id).all()
    return [{"ticker": i.ticker, "shares": i.shares, "buy_price": i.buy_price} for i in items]

@app.delete("/portfolio/remove/{ticker}")
def remove_from_portfolio(ticker: str, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_user)):
    user_id = current_user.id
    item = db.query(models.PortfolioItem).filter(
        models.PortfolioItem.user_id == user_id, 
        models.PortfolioItem.ticker == ticker.upper()
    ).first()
    if item:
        db.delete(item)
        db.commit()
        return {"message": f"Removed {ticker.upper()}"}
    raise HTTPException(status_code=404, detail="Ticker not found in portfolio")

# Catch-all route to serve React SPA
@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    import os
    file_path = os.path.join("static", full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse("static/index.html")

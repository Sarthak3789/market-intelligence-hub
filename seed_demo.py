import database
import models
from auth import get_password_hash

db = database.SessionLocal()
demo_email = "demo@marketintel.ai"
if not db.query(models.User).filter(models.User.email == demo_email).first():
    demo_user = models.User(
        username="GuestExplorer",
        email=demo_email,
        password=get_password_hash("demo123"),
        is_verified=True,
        verification_code="000000"
    )
    db.add(demo_user)
    db.commit()
    db.refresh(demo_user)
    
    items = [
        models.PortfolioItem(user_id=demo_user.id, ticker="AAPL", shares=10.0, buy_price=150.0),
        models.PortfolioItem(user_id=demo_user.id, ticker="NVDA", shares=5.0, buy_price=120.0),
        models.PortfolioItem(user_id=demo_user.id, ticker="TSLA", shares=20.0, buy_price=180.0)
    ]
    db.add_all(items)
    db.commit()
db.close()
print("Demo user seeded!")

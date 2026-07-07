import urllib.request
import xml.etree.ElementTree as ET
import yfinance as yf

def fetch_financial_news(ticker: str, count: int = 5):
    """
    Fetches the latest news headlines for a given stock ticker using Google News RSS.
    This is highly robust and avoids rate-limiting issues common with yfinance.
    """
    try:
        url = f'https://news.google.com/rss/search?q={ticker}+stock&hl=en-US&gl=US&ceid=US:en'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        xml_data = urllib.request.urlopen(req).read()
        
        root = ET.fromstring(xml_data)
        headlines = []
        
        for item in root.findall('.//item')[:count]:
            title = item.find('title')
            link_el = item.find('link')
            if title is not None and title.text and link_el is not None:
                # Clean up the publisher name at the end (e.g. "- Yahoo Finance")
                headline_text = title.text.split(' - ')[0]
                headlines.append({"headline": headline_text, "link": link_el.text})
                
        return headlines
    except Exception as e:
        print(f"Error fetching news for {ticker}: {e}")
        return []

def get_live_price(ticker: str) -> float:
    try:
        return float(yf.Ticker(ticker).fast_info['lastPrice'])
    except Exception as e:
        print(f"Error fetching price for {ticker}: {e}")
        return 0.0

def get_historical_prices(ticker: str, days: int = 7):
    try:
        hist = yf.Ticker(ticker).history(period=f"{days}d")
        if hist.empty: return []
        
        results = []
        for date, row in hist.iterrows():
            results.append({"date": date.strftime("%m-%d"), "price": float(row["Close"])})
        return results
    except Exception as e:
        print(f"Error fetching history for {ticker}: {e}")
        return []

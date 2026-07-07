import os
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.pipeline import make_pipeline
import joblib

MODEL_PATH = "sentiment_model.pkl"

def train_and_save_model():
    """
    Trains a Logistic Regression model on the REAL Kaggle Financial PhraseBank dataset.
    Downloads it dynamically from a public raw CSV mirror.
    """
    print("Downloading Financial PhraseBank dataset...")
    try:
        url = "https://raw.githubusercontent.com/ukairia777/finance_sentiment_corpus/main/finance_data.csv"
        df = pd.read_csv(url)
        
        # Rename columns to match our expected format
        df.rename(columns={"sentence": "headline", "labels": "sentiment"}, inplace=True)
        df["sentiment"] = df["sentiment"].str.capitalize() # "positive" -> "Positive"
        
        print(f"Successfully loaded {len(df)} financial headlines for training.")
        
    except Exception as e:
        print(f"Failed to download dataset: {e}. Using fallback bootstrap data.")
        data = {
            "headline": ["Profits surge", "Stock crashes", "CEO steps down", "Market remains flat"],
            "sentiment": ["Positive", "Negative", "Negative", "Neutral"]
        }
        df = pd.DataFrame(data)
    
    print("Training ML Sentiment Model...")
    model = make_pipeline(TfidfVectorizer(max_features=5000, ngram_range=(1,2), stop_words='english'), LinearSVC(class_weight='balanced'))
    model.fit(df["headline"], df["sentiment"])
    
    joblib.dump(model, MODEL_PATH)
    print(f"Model successfully trained and saved to {MODEL_PATH}")

def predict_sentiment(headline: str) -> str:
    if not os.path.exists(MODEL_PATH):
        train_and_save_model()
    
    model = joblib.load(MODEL_PATH)
    prediction = model.predict([headline])[0]
    return prediction

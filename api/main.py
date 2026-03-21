from fastapi import FastAPI, HTTPException, Depends, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime
import traceback
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func
import pandas as pd

# Import database and models
from api.db import get_db, engine, Base
from api.models import Transaction, Feedback
from api.insights import router as insights_router
from api.budget import router as budget_router

# Import ML components
from core.preprocessor import TransactionPreprocessor, clean_text_for_model, extract_amount, extract_recipient
from core.model import TransactionClassifier
from training.train_model import train_with_feedback
from api.scheduler import run_nightly_retrain
from api.core.agents import ParserAgent, ConfidenceAgent, AnomalyAgent, ChatAgent, BudgetAgent

# Load environment variables explicitly from current directory
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=env_path)
print(f"🚀 Loading environment from: {env_path}")

# Initialize FastAPI app
app = FastAPI(
    title="TransactAI API",
    version="2.0",
    description="Smart Transaction Categorization + Feedback System",
)

# Parse allowed origins from environment or use defaults
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_env:
    origins = [origin.strip() for origin in allowed_origins_env.split(",")]
else:
    origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        # Add your production domain via ALLOWED_ORIGINS environment variable
    ]

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(insights_router, prefix="/insights")
app.include_router(budget_router, prefix="/budget")

# ============================================================
# Initialize Database Tables
# ============================================================
@app.on_event("startup")
def init_db():
    """Create database tables if they don't exist"""
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables initialized")
    except Exception as e:
        print(f"⚠️ Database initialization warning: {e}")

# ============================================================
# Load ML Model
# ============================================================
processor = TransactionPreprocessor()

# Initialize classifier and attach to app.state for global reload access
try:
    initial_classifier = TransactionClassifier()
    initial_classifier.load(dir_path="models", name="classifier")
    app.state.classifier = initial_classifier
    print("✅ ML Model loaded successfully")
except Exception as e:
    print(f"⚠️ ML Model loading warning: {e}")
    print("⚠️ Running without ML model - some features may be limited")
    app.state.classifier = None

# Initialize AI Agents
parser_agent = ParserAgent()
confidence_agent = ConfidenceAgent()
anomaly_agent = AnomalyAgent()
chat_agent = ChatAgent()
budget_agent = BudgetAgent()

# ============================================================
# Categories
# ============================================================
CATEGORIES = [
    "Food",
    "Grocery",
    "Fuel",
    "Shopping",
    "Medical",
    "Bills",
    "Transport",
    "Refund",
    "Salary",
    "Subscription",
    "UPI_Transfer",
]

# ============================================================
# Schemas
# ============================================================
class ClassificationRequest(BaseModel):
    text: str

class ManualCategoryRequest(BaseModel):
    message: str
    category: str
    amount: Optional[float] = None
    receiver: Optional[str] = None
    clean_text: Optional[str] = None

class FeedbackModel(BaseModel):
    user_id: Optional[str] = None
    raw_text: str
    predicted: str
    corrected: str
    confidence: float

# ============================================================
# Auth Helper
# ============================================================
from fastapi import Header

def get_current_user_id(x_user_id: Optional[str] = Header(None)):
    """Simple header-based user identification for production demonstration."""
    return x_user_id or "default_user"

# ============================================================
# Root
# ============================================================
@app.get("/")
def root():
    return {"status": "TransactAI API is running 🚀"}

# ============================================================
# Classify
# ============================================================
@app.post("/classify")
def classify(payload: Dict, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    text = payload.get("message")
    if not text:
        raise HTTPException(status_code=400, detail="Missing 'message' field")

    cleaned = clean_text_for_model(text)
    
    # Use ML model if available, otherwise use fallback
    if app.state.classifier:
        try:
            cat, conf, meta = app.state.classifier.predict(text)
        except Exception as e:
            print(f"ML prediction error: {e}")
            cat, conf = "Food", 0.5
    else:
        # Fallback when model is not loaded
        cat, conf = "Food", 0.5

    amount = extract_amount(text)
    receiver = extract_recipient(text)
    txn_time = datetime.now()
    
    if conf >= 0.6:
        is_anomaly = False
        anomaly_reason = None
        
        # Check for anomaly
        if anomaly_agent.is_enabled():
            anomaly_result = anomaly_agent.detect(
                amount=amount, category=cat, merchant=receiver, text=text
            )
            if anomaly_result and anomaly_result.is_anomaly:
                is_anomaly = True
                anomaly_reason = anomaly_result.anomaly_reason

        txn = Transaction(
            raw_text=text,
            clean_text=cleaned,
            amount=amount,
            sender_name="You",
            receiver_name=receiver,
            txn_time=txn_time,
            predicted_category=cat,
            confidence=float(conf),
            source="mobile",
            is_anomaly=is_anomaly,
            anomaly_reason=anomaly_reason,
            user_id=user_id
        )
        try:
            db.add(txn)
            db.commit()
            db.refresh(txn)
        except Exception as e:
            db.rollback()
            print(f"Failed to save transaction to DB: {e}")

        return {
            "status": "saved",
            "category": cat,
            "confidence": float(conf),
            "amount": amount,
            "receiver": receiver,
            "is_anomaly": is_anomaly,
            "anomaly_reason": anomaly_reason
        }

    # Call Confidence Agent to explain low confidence
    ai_explanation = None
    ai_suggestions = []
    if confidence_agent.is_enabled():
        explanation_result = confidence_agent.explain(
            text=text, amount=amount, predicted=cat, categories=CATEGORIES
        )
        if explanation_result:
            ai_explanation = explanation_result.explanation
            ai_suggestions = explanation_result.suggestions

    return {
        "status": "low_confidence",
        "confidence": float(conf),
        "options": CATEGORIES,
        "allow_new_category": True,
        "amount": amount,
        "receiver": receiver,
        "clean_text": cleaned,
        "raw_text": text,
        "ai_explanation": ai_explanation,
        "ai_suggestions": ai_suggestions
    }

# ============================================================
# Manual Category Selection
# ============================================================
@app.post("/manual-category")
def manual_category(request: ManualCategoryRequest, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    if not request.message or not request.category:
        raise HTTPException(status_code=400, detail="Missing required fields")

    txn = Transaction(
        raw_text=request.message,
        clean_text=request.clean_text,
        amount=request.amount,
        sender_name="You",
        receiver_name=request.receiver,
        txn_time=datetime.now(),
        predicted_category=request.category,
        confidence=0.0,
        source="mobile",
        user_id=user_id
    )

    feedback_row = Feedback(
        message=request.message,
        clean_text=request.clean_text,
        amount=request.amount,
        receiver_name=request.receiver,
        chosen_category=request.category,
        user_id=user_id
    )

    try:
        db.add(txn)
        db.add(feedback_row)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"❌ Feedback Insert Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to save feedback")

    return {"status": "saved_with_feedback", "category": request.category}

# ============================================================
# Add Category
# ============================================================
@app.post("/add-category")
def add_category(payload: Dict):
    new_cat = payload.get("category", "").strip()
    if not new_cat:
        raise HTTPException(status_code=400, detail="Category missing")

    if new_cat not in CATEGORIES:
        CATEGORIES.append(new_cat)

    return {"status": "added", "categories": CATEGORIES}

# ============================================================
# New AI Endpoints
# ============================================================
class ParseSmsRequest(BaseModel):
    message: str

@app.post("/parse-sms")
def parse_sms(request: ParseSmsRequest):
    if not request.message:
        raise HTTPException(status_code=400, detail="Missing message")
    
    if not parser_agent.is_enabled():
        raise HTTPException(status_code=503, detail="Parser Agent (Gemini) is not enabled.")
        
    result = parser_agent.parse(request.message)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to parse message")
        
    return {"status": "success", "parsed": result.model_dump()}

@app.get("/anomalies")
def get_anomalies(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    rows = db.query(Transaction).filter(Transaction.user_id == user_id, Transaction.is_anomaly == True).order_by(desc(Transaction.txn_time)).all()
    return {
        "count": len(rows),
        "results": [
            {
                "id": str(t.id),
                "raw_text": t.raw_text,
                "amount": float(t.amount) if t.amount else None,
                "category": t.predicted_category,
                "receiver": t.receiver_name,
                "timestamp": t.txn_time.isoformat() if t.txn_time else None,
                "anomaly_reason": getattr(t, 'anomaly_reason', None)
            }
            for t in rows
        ]
    }

class ChatRequest(BaseModel):
    query: str
    context: List[Dict] = []

@app.post("/chat")
def chat_with_ai(request: ChatRequest):
    if not request.query:
        raise HTTPException(status_code=400, detail="Missing query")
        
    if not chat_agent.is_enabled():
        raise HTTPException(status_code=503, detail="Chat Agent (Gemini) is not enabled.")
        
    response = chat_agent.chat(user_query=request.query, context_data=request.context)
    if not response:
        raise HTTPException(status_code=500, detail="Failed to generate AI response")
        
    return {"status": "success", "response": response}

class BudgetSummaryRequest(BaseModel):
    summary: Dict

@app.post("/budget-advice")
def get_budget_advice(request: BudgetSummaryRequest):
    """
    Using POST since we're passing complex JSON summary data from the frontend 
    without needing a dedicated server-side summary logic right now.
    """
    if not request.summary:
        raise HTTPException(status_code=400, detail="Missing summary data")
        
    if not budget_agent.is_enabled():
        raise HTTPException(status_code=503, detail="Budget Agent (Gemini) is not enabled.")
        
    advice = budget_agent.generate_advice(request.summary)
    if not advice:
        raise HTTPException(status_code=500, detail="Failed to generate budget advice")
        
    return {"status": "success", "advice": advice.model_dump()}

# ============================================================
# Transactions List
# ============================================================
@app.get("/transactions")
def get_transactions(
    category: Optional[str] = None,
    receiver: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    limit: int = 50,
    offset: int = 0,
    sort: str = "desc",
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    query = db.query(Transaction).filter(Transaction.user_id == user_id)

    if category:
        query = query.filter(Transaction.predicted_category == category)

    if receiver:
        query = query.filter(Transaction.receiver_name.ilike(f"%{receiver}%"))

    if min_amount:
        query = query.filter(Transaction.amount >= min_amount)

    if max_amount:
        query = query.filter(Transaction.amount <= max_amount)

    query = query.order_by(asc(Transaction.txn_time) if sort == "asc" else desc(Transaction.txn_time))

    rows = query.offset(offset).limit(limit).all()

    return {
        "count": len(rows),
        "results": [
            {
                "id": str(t.id),
                "raw_text": t.raw_text,
                "amount": float(t.amount) if t.amount else None,
                "category": t.predicted_category,
                "receiver": t.receiver_name,
                "timestamp": t.txn_time.isoformat() if t.txn_time else None,
                "confidence": float(t.confidence) if t.confidence else None,
                "is_anomaly": getattr(t, 'is_anomaly', False),
                "anomaly_reason": getattr(t, 'anomaly_reason', None)
            }
            for t in rows
        ],
    }

# ============================================================
# Summary Analytics
# ============================================================
@app.get("/summary")
def get_summary(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    try:
        total_spent = db.query(func.sum(Transaction.amount)).filter(Transaction.user_id == user_id).scalar() or 0
        total_transactions = db.query(func.count(Transaction.id)).filter(Transaction.user_id == user_id).scalar()

        category_data = (
            db.query(Transaction.predicted_category, func.sum(Transaction.amount))
            .filter(Transaction.user_id == user_id)
            .group_by(Transaction.predicted_category)
            .all()
        )

        category_summary = {row[0] or "Unknown": float(row[1]) if row[1] else 0.0 for row in category_data}

        latest = db.query(Transaction).filter(Transaction.user_id == user_id).order_by(desc(Transaction.txn_time)).first()
        latest_txn = None

        if latest:
            latest_txn = {
                "id": str(latest.id),
                "amount": float(latest.amount) if latest.amount else None,
                "category": latest.predicted_category,
                "receiver": latest.receiver_name,
                "timestamp": latest.txn_time.isoformat() if latest.txn_time else None,
            }

        highest_category = max(category_summary, key=category_summary.get) if category_summary else None

        return {
            "total_spent": float(total_spent),
            "total_transactions": total_transactions,
            "category_summary": category_summary,
            "highest_spending_category": highest_category,
            "latest_transaction": latest_txn,
        }
    except Exception as e:
        print(f"Summary error: {e}")
        return {
            "total_spent": 0.0,
            "total_transactions": 0,
            "category_summary": {},
            "highest_spending_category": None,
            "latest_transaction": None,
        }

# ============================================================
# Feedback
# ============================================================
@app.post("/feedback")
def feedback(data: FeedbackModel, db: Session = Depends(get_db)):
    try:
        feedback_row = Feedback(
            message=data.raw_text,
            clean_text=None,
            amount=None,
            receiver_name=None,
            chosen_category=data.corrected,
        )
        db.add(feedback_row)
        db.commit()
        return {"status": "success", "message": "feedback stored ✔"}
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# Retrain Model
# ============================================================
@app.post("/retrain-model")
def retrain_model(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Trigger model retraining using all rows from `feedback` table.
    This runs in background and immediately returns a 202 Accepted response.
    """
    try:
        # Read feedback rows from DB
        rows = db.query(Feedback).all()
        if not rows:
            return {"status": "no_feedback", "message": "No feedback rows found; skipping retrain."}

        # Convert to DataFrame in the exact format expected by training
        records = []
        for r in rows:
            records.append({"Description": (r.message or ""), "Category": (r.chosen_category or "")})
        feedback_df = pd.DataFrame.from_records(records)

        # Background worker: run training with feedback, then reload classifier
        def _worker(df):
            try:
                print("[RETRAIN] started background retraining with feedback rows:", len(df))
                res = train_with_feedback(df)
                print("[RETRAIN] finished training:", res)
                # reload classifier in-app
                try:
                    new_clf = TransactionClassifier()
                    new_clf.load(dir_path="models", name="classifier")
                    app.state.classifier = new_clf
                    print("[RETRAIN] model reloaded into app.state.classifier")
                except Exception as e:
                    print("[RETRAIN] failed to reload classifier into app.state:", e)
            except Exception as e:
                print("[RETRAIN] Retraining failed:", e)

        # schedule background task (non-blocking)
        background_tasks.add_task(_worker, feedback_df)

        return {"status": "accepted", "message": "Retraining started in background"}
    except Exception as e:
        print(f"Retrain error: {e}")
        return {"status": "error", "message": str(e)}

# ============================================================
# Update Transaction
# ============================================================
class UpdateTransactionRequest(BaseModel):
    category: str

@app.patch("/transactions/{txn_id}")
def update_transaction(
    txn_id: str, 
    request: UpdateTransactionRequest, 
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    txn = db.query(Transaction).filter(Transaction.id == txn_id, Transaction.user_id == user_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    txn.predicted_category = request.category
    
    # Also add or update feedback for future training
    feedback = db.query(Feedback).filter(
        Feedback.message == txn.raw_text,
        Feedback.user_id == user_id
    ).first()
    
    if feedback:
        feedback.chosen_category = request.category
    else:
        new_feedback = Feedback(
            message=txn.raw_text,
            clean_text=txn.clean_text,
            amount=txn.amount,
            receiver_name=txn.receiver_name,
            chosen_category=request.category,
            user_id=user_id
        )
        db.add(new_feedback)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"status": "success"}

# ============================================================
# Start scheduled nightly retrain on startup
# ============================================================
@app.on_event("startup")
def start_scheduler():
    try:
        run_nightly_retrain(app, hour=3, minute=0)
    except Exception as e:
        print(f"Failed to start nightly scheduler: {e}")

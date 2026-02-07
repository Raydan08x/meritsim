"""
MeritSim - FastAPI Main Application
Educational platform for Colombian state exam preparation
"""
import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Depends, HTTPException, status, Query, Body, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
import subprocess
import json
import logging

from models import (
    get_db, User, UserRole, Entity, Profile, 
    Question, StudySession, StudyMode, Answer, Topic, Material
)
from material_indexer import index_materials, suggest_materials_for_user
from openai_service import (
    generate_explanation_openai, 
    generate_study_recommendation_openai, 
    chat_with_tutor,
    generate_ai_question
)

# ============== Configuration ==============
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# ============== FastAPI App ==============
app = FastAPI(
    title="MeritSim API",
    description="API para plataforma educativa de preparación de exámenes de estado",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== Pydantic Schemas ==============
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    role: str
    xp_points: int
    level: int
    is_active: bool

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class QuestionResponse(BaseModel):
    id: int
    text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    entity: Optional[str] = None
    topic: Optional[str] = None
    difficulty: int

    class Config:
        from_attributes = True


class AnswerRequest(BaseModel):
    question_id: int
    selected_option: str  # A, B, C, D
    time_spent_seconds: Optional[int] = None


class AnswerResponse(BaseModel):
    is_correct: bool
    correct_answer: str
    explanation: Optional[str] = None
    page_reference: Optional[str] = None
    xp_earned: int


class SimulacroStartRequest(BaseModel):
    entity_id: Optional[int] = None
    num_questions: int = 20
    time_limit_minutes: int = 60
    difficulty: Optional[int] = None


class SimulacroSubmitRequest(BaseModel):
    session_id: int
    answers: List[AnswerRequest]


class SessionResponse(BaseModel):
    id: int
    mode: str
    total_questions: int
    correct_answers: int
    score: Optional[float]
    xp_earned: int
    started_at: datetime
    completed_at: Optional[datetime]


class ProgressResponse(BaseModel):
    total_sessions: int
    total_questions_answered: int
    correct_percentage: float
    current_streak: int
    level: int
    xp_points: int
    entity_progress: List[dict]


# ============== Auth Utilities ==============
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


# ============== Health Check ==============
@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        db.execute("SELECT 1")
        return {"status": "ok", "database": "connected", "timestamp": datetime.utcnow()}
    except Exception as e:
        return {"status": "error", "database": "disconnected", "error": str(e)}


# ============== Auth Endpoints ==============
@app.post("/api/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/auth/login-json", response_model=Token)
async def login_json(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Alternative login endpoint that accepts JSON"""
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role=UserRole.USER,
        xp_points=0,
        level=1
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.get("/api/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ============== Entities & Topics ==============
@app.get("/api/entities")
async def get_entities(db: Session = Depends(get_db)):
    entities = db.query(Entity).all()
    return [
        {
            "id": e.id,
            "name": e.name,
            "description": e.description,
            "icon": e.icon,
            "color": e.color,
            "question_count": db.query(Question).filter(Question.entity_id == e.id).count()
        }
        for e in entities
    ]


@app.get("/api/topics")
async def get_topics(db: Session = Depends(get_db)):
    topics = db.query(Topic).all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "question_count": db.query(Question).filter(Question.topic_id == t.id).count()
        }
        for t in topics
    ]


# ============== Questions ==============
@app.get("/api/questions", response_model=List[QuestionResponse])
async def get_questions(
    entity_id: Optional[int] = None,
    topic_id: Optional[int] = None,
    difficulty: Optional[int] = None,
    limit: int = Query(default=20, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Question).filter(Question.is_active == True)
    
    if entity_id:
        query = query.filter(Question.entity_id == entity_id)
    if topic_id:
        query = query.filter(Question.topic_id == topic_id)
    if difficulty:
        query = query.filter(Question.difficulty == difficulty)
    
    questions = query.order_by(func.random()).limit(limit).all()
    
    return [
        QuestionResponse(
            id=q.id,
            text=q.text,
            option_a=q.option_a,
            option_b=q.option_b,
            option_c=q.option_c,
            option_d=q.option_d,
            entity=q.entity.name if q.entity else None,
            topic=q.topic.name if q.topic else None,
            difficulty=q.difficulty
        )
        for q in questions
    ]


# ============== Simulacro Mode ==============
@app.post("/api/study/simulacro/start")
async def start_simulacro(
    request: SimulacroStartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start a timed exam simulation - no feedback until the end"""
    # Get questions
    query = db.query(Question).filter(Question.is_active == True)
    if request.entity_id:
        query = query.filter(Question.entity_id == request.entity_id)
    
    if request.difficulty:
        query = query.filter(Question.difficulty == request.difficulty)
    
    questions = query.order_by(func.random()).limit(request.num_questions).all()
    
    if not questions:
        raise HTTPException(status_code=404, detail="No questions available")
    
    # Create session
    session = StudySession(
        user_id=current_user.id,
        mode=StudyMode.SIMULACRO,
        entity_id=request.entity_id,
        time_limit_minutes=request.time_limit_minutes,
        total_questions=len(questions)
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return {
        "session_id": session.id,
        "mode": "SIMULACRO",
        "time_limit_minutes": request.time_limit_minutes,
        "total_questions": len(questions),
        "questions": [
            {
                "id": q.id,
                "text": q.text,
                "option_a": q.option_a,
                "option_b": q.option_b,
                "option_c": q.option_c,
                "option_d": q.option_d,
                "entity": q.entity.name if q.entity else None,
                "topic": q.topic.name if q.topic else None
            }
            for q in questions
        ]
    }


@app.post("/api/study/simulacro/submit")
async def submit_simulacro(
    request: SimulacroSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit all answers at once and get complete feedback"""
    session = db.query(StudySession).filter(
        StudySession.id == request.session_id,
        StudySession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.completed_at:
        raise HTTPException(status_code=400, detail="Session already completed")
    
    correct_count = 0
    total_xp = 0
    results = []
    
    for ans in request.answers:
        question = db.query(Question).filter(Question.id == ans.question_id).first()
        if not question:
            continue
        
        is_correct = ans.selected_option.upper() == question.correct_answer.upper()
        if is_correct:
            correct_count += 1
            total_xp += question.xp_reward
        
        # Save answer
        answer = Answer(
            session_id=session.id,
            user_id=current_user.id,
            question_id=question.id,
            selected_option=ans.selected_option.upper(),
            is_correct=is_correct,
            time_spent_seconds=ans.time_spent_seconds
        )
        db.add(answer)
        
        results.append({
            "question_id": question.id,
            "selected": ans.selected_option.upper(),
            "correct_answer": question.correct_answer,
            "is_correct": is_correct,
            "explanation": question.explanation,
            "page_reference": question.page_reference
        })
    
    # Update session
    session.correct_answers = correct_count
    session.score = (correct_count / len(request.answers)) * 100 if request.answers else 0
    session.xp_earned = total_xp
    session.completed_at = datetime.utcnow()
    
    # Update user XP
    current_user.xp_points += total_xp
    # Level up logic (every 1000 XP = 1 level)
    current_user.level = (current_user.xp_points // 1000) + 1
    
    db.commit()
    
    return {
        "session_id": session.id,
        "total_questions": len(request.answers),
        "correct_answers": correct_count,
        "score": session.score,
        "xp_earned": total_xp,
        "new_level": current_user.level,
        "results": results
    }


# ============== Advanced Study Mode ==============
@app.post("/api/study/advanced/start")
async def start_advanced_study(
    entity_id: Optional[int] = None,
    profile_id: Optional[int] = None,
    topic: Optional[str] = None,
    num_questions: int = 20,
    difficulty: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start advanced study mode with immediate feedback"""
    query = db.query(Question).filter(Question.is_active == True)
    if entity_id:
        query = query.filter(Question.entity_id == entity_id)
    if profile_id:
        query = query.filter(Question.profile_id == profile_id)
    if topic:
        query = query.filter(Question.topic == topic)
    if difficulty:
        query = query.filter(Question.difficulty == difficulty)
    
    questions = query.order_by(func.random()).limit(num_questions).all()
    
    if not questions:
        raise HTTPException(status_code=404, detail="No questions available")
    
    session = StudySession(
        user_id=current_user.id,
        mode=StudyMode.ADVANCED,
        entity_id=entity_id,
        total_questions=len(questions)
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return {
        "session_id": session.id,
        "mode": "ADVANCED",
        "total_questions": len(questions),
        "questions": [
            {
                "id": q.id,
                "text": q.text,
                "option_a": q.option_a,
                "option_b": q.option_b,
                "option_c": q.option_c,
                "option_d": q.option_d,
                "entity": q.entity.name if q.entity else None,
                "topic": q.topic.name if q.topic else None,
                "difficulty": q.difficulty
            }
            for q in questions
        ]
    }


@app.post("/api/study/advanced/answer", response_model=AnswerResponse)
async def answer_advanced(
    session_id: int,
    answer_data: AnswerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Answer a single question and get immediate feedback"""
    session = db.query(StudySession).filter(
        StudySession.id == session_id,
        StudySession.user_id == current_user.id,
        StudySession.mode == StudyMode.ADVANCED
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    question = db.query(Question).filter(Question.id == answer_data.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    is_correct = answer_data.selected_option.upper() == question.correct_answer.upper()
    xp_earned = question.xp_reward if is_correct else 0
    
    # Save answer
    answer = Answer(
        session_id=session.id,
        user_id=current_user.id,
        question_id=question.id,
        selected_option=answer_data.selected_option.upper(),
        is_correct=is_correct,
        time_spent_seconds=answer_data.time_spent_seconds
    )
    db.add(answer)
    
    # Update session stats
    session.total_questions = db.query(Answer).filter(Answer.session_id == session.id).count() + 1
    if is_correct:
        session.correct_answers = (session.correct_answers or 0) + 1
    session.xp_earned = (session.xp_earned or 0) + xp_earned
    
    # Update user XP
    current_user.xp_points += xp_earned
    current_user.level = (current_user.xp_points // 1000) + 1
    
    db.commit()
    
    return AnswerResponse(
        is_correct=is_correct,
        correct_answer=question.correct_answer,
        explanation=question.explanation,
        page_reference=question.page_reference,
        xp_earned=xp_earned
    )


# ============== Progress & Stats ==============
@app.get("/api/users/me/progress", response_model=ProgressResponse)
async def get_my_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's learning progress and stats"""
    total_sessions = db.query(StudySession).filter(
        StudySession.user_id == current_user.id
    ).count()
    
    total_answers = db.query(Answer).filter(Answer.user_id == current_user.id).count()
    correct_answers = db.query(Answer).filter(
        Answer.user_id == current_user.id,
        Answer.is_correct == True
    ).count()
    
    correct_percentage = (correct_answers / total_answers * 100) if total_answers > 0 else 0
    
    # Progress by entity
    entities = db.query(Entity).all()
    entity_progress = []
    for entity in entities:
        entity_answers = db.query(Answer).join(Question).filter(
            Answer.user_id == current_user.id,
            Question.entity_id == entity.id
        ).count()
        
        entity_correct = db.query(Answer).join(Question).filter(
            Answer.user_id == current_user.id,
            Question.entity_id == entity.id,
            Answer.is_correct == True
        ).count()
        
        entity_progress.append({
            "entity_id": entity.id,
            "entity_name": entity.name,
            "color": entity.color,
            "total_answers": entity_answers,
            "correct_answers": entity_correct,
            "percentage": (entity_correct / entity_answers * 100) if entity_answers > 0 else 0
        })
    
    return ProgressResponse(
        total_sessions=total_sessions,
        total_questions_answered=total_answers,
        correct_percentage=round(correct_percentage, 1),
        current_streak=current_user.current_streak,
        level=current_user.level,
        xp_points=current_user.xp_points,
        entity_progress=entity_progress
    )

@app.get("/api/study/adventure/map")
def get_adventure_map(
    entity_id: Optional[int] = None,
    profile_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Determine Entity (use user's default if not provided)
    if not entity_id and user.entity_id:
        entity_id = user.entity_id

    # Get grouping of questions by topic
    query = db.query(Question.topic, func.count(Question.id), func.min(Question.id)).filter(Question.is_active == True)
    
    if entity_id:
        query = query.filter(Question.entity_id == entity_id)
    if profile_id:
        query = query.filter(Question.profile_id == profile_id)
        
    topic_stats = query.group_by(Question.topic).all()
    
    # Get user progress per topic
    # This is a bit complex in SQL, so we'll do simple counts
    # Get total answers by user per topic
    user_answers = db.query(Question.topic, func.count(func.distinct(Answer.question_id)))\
        .join(Answer, Answer.question_id == Question.id)\
        .filter(Answer.user_id == user.id)\
        .filter(Answer.is_correct == True)\
        .group_by(Question.topic).all()
        
    progress_map = {t: c for t, c in user_answers}
    
    nodes = []
    # If no topics found (fresh DB), return empty or synthetic
    if not topic_stats:
        return {"nodes": []}

    # Sort topics (alphabetical or by synthetic ID)
    sorted_topics = sorted(topic_stats, key=lambda x: x[0] or "")
    
    for i, (topic, total, first_id) in enumerate(sorted_topics):
        topic_name = topic or f"Módulo General {i+1}"
        completed = progress_map.get(topic, 0)
        
        status = "locked"
        if i == 0 or (nodes and nodes[i-1]["progress"] >= 60): # Unlock if previous is 60% done
            status = "available"
        if completed >= total and total > 0:
            status = "completed"
            
        progress_pct = int((completed / total * 100) if total > 0 else 0)
        
        nodes.append({
            "id": f"node_{i}",
            "topic": topic,
            "label": topic_name,
            "status": status,
            "progress": progress_pct,
            "total_questions": total,
            "completed_questions": completed,
            "x": 20 + (i % 2) * 60, # Zig-zag layout coordinates
            "y": 20 + i * 20
        })
        
    return {"nodes": nodes}

@app.post("/api/admin/ingest-materials")
def run_ingestion(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    def _run_scripts():
        base_dir = os.path.dirname(os.path.abspath(__file__))
        logging.info("Starting background ingestion...")
        try:
            # Install dependencies if missing (inside container)
            # This is risky if it fails, but better than nothing
            subprocess.run(["pip", "install", "pypdf"], cwd=base_dir)
            
            # Run Indexer
            res1 = subprocess.run(["python", "material_indexer.py"], cwd=base_dir, capture_output=True, text=True)
            logging.info(f"Indexer Output: {res1.stdout}")
            
            # Run Generator
            res2 = subprocess.run(["python", "question_generator.py"], cwd=base_dir, capture_output=True, text=True)
            logging.info(f"Generator Output: {res2.stdout}")
            
        except Exception as e:
            logging.error(f"Ingestion failed: {e}")

    background_tasks.add_task(_run_scripts)
    return {"status": "Ingestion started in background"}


# ============== Materials ==============
@app.post("/api/materials/index")
async def reindex_materials(
    current_user: User = Depends(get_admin_user)
):
    """Reindex all materials from the mounted folder (Admin only)"""
    result = index_materials()
    return result


@app.get("/api/materials/suggestions")
async def get_material_suggestions(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get personalized material suggestions based on user's weak areas"""
    suggestions = suggest_materials_for_user(current_user.id, limit)
    return {"suggestions": suggestions}


@app.get("/api/materials")
async def get_all_materials(
    entity_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all indexed materials"""
    query = db.query(Material)
    if entity_id:
        query = query.filter(Material.entity_id == entity_id)
    
    materials = query.all()
    return [
        {
            "id": m.id,
            "filename": m.filename,
            "filepath": m.filepath,
            "title": m.title,
            "entity": m.entity.name if m.entity else None,
            "profile": m.profile.name if m.profile else None,
            "file_size": m.file_size,
            "indexed_at": m.indexed_at.isoformat() if m.indexed_at else None
        }
        for m in materials
    ]


# ============== Admin Stats ==============
@app.get("/api/admin/stats")
async def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get platform-wide statistics (Admin only)"""
    return {
        "total_users": db.query(User).count(),
        "active_users": db.query(User).filter(User.is_active == True).count(),
        "total_questions": db.query(Question).count(),
        "total_sessions": db.query(StudySession).count(),
        "total_answers": db.query(Answer).count(),
        "total_materials": db.query(Material).count(),
        "entities": db.query(Entity).count()
    }


# ============== AI Tutor Chat ==============
class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None


@app.post("/api/chat")
async def chat_with_ai_tutor(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    """Chat with MeritBot AI tutor powered by OpenAI"""
    response = await chat_with_tutor(request.message, request.context)
    return {"response": response}


@app.post("/api/study/ai-explanation")
async def get_ai_explanation(
    question_id: int,
    selected_option: str,
    db: Session = Depends(get_db)
):
    """Get AI-powered explanation for a question using OpenAI"""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    is_correct = selected_option.upper() == question.correct_answer.upper()
    topic_name = question.topic.name if question.topic else None
    
    explanation = await generate_explanation_openai(
        question_text=question.text,
        correct_answer=question.correct_answer,
        user_answer=selected_option,
        topic=topic_name,
        is_correct=is_correct
    )
    
    return {
        "explanation": explanation,
        "is_correct": is_correct,
        "correct_answer": question.correct_answer
    }


@app.post("/api/study/ai-question-generate")
async def generate_question_ai(
    entity: str = "General",
    topic: Optional[str] = None,
    profile: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Generate a random new question using AI"""
    question_data = await generate_ai_question(entity, topic, profile)
    return question_data


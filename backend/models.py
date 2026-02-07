"""
MeritSim - Database Models
SQLAlchemy models for the educational platform
"""
from datetime import datetime
from enum import Enum
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, 
    ForeignKey, Float, Enum as SQLEnum, create_engine
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://meritsim:Peluche!24@localhost:5433/meritsim_db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    USER = "USER"


class StudyMode(str, Enum):
    SIMULACRO = "SIMULACRO"
    ADVANCED = "ADVANCED"


# ============== USERS ==============
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.USER)
    is_active = Column(Boolean, default=True)
    xp_points = Column(Integer, default=0)
    level = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    study_sessions = relationship("StudySession", back_populates="user")
    answers = relationship("Answer", back_populates="user")


# ============== ENTITIES (DIAN, CAR, etc.) ==============
class Entity(Base):
    __tablename__ = "entities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)  # DIAN, CAR, Acueducto
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)  # Material icon name
    color = Column(String(20), nullable=True)  # Hex color
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    profiles = relationship("Profile", back_populates="entity")
    materials = relationship("Material", back_populates="entity")
    questions = relationship("Question", back_populates="entity")


# ============== PROFILES (Gestor I, Profesional, etc.) ==============
class Profile(Base):
    __tablename__ = "profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id"), nullable=False)
    name = Column(String(100), nullable=False)  # Gestor I, Profesional Universitario
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    entity = relationship("Entity", back_populates="profiles")
    materials = relationship("Material", back_populates="profile")
    questions = relationship("Question", back_populates="profile")


# ============== MATERIALS (PDFs) ==============
class Material(Base):
    __tablename__ = "materials"
    
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id"), nullable=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"), nullable=True)
    filename = Column(String(255), nullable=False)
    filepath = Column(String(500), nullable=False)
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    file_size = Column(Integer, nullable=True)  # bytes
    page_count = Column(Integer, nullable=True)
    indexed_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    entity = relationship("Entity", back_populates="materials")
    profile = relationship("Profile", back_populates="materials")
    questions = relationship("Question", back_populates="material")


# ============== TOPICS ==============
class Topic(Base):
    __tablename__ = "topics"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    parent_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    
    # Relationships
    questions = relationship("Question", back_populates="topic")


# ============== QUESTIONS ==============
class Question(Base):
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("entities.id"), nullable=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"), nullable=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=True)
    
    text = Column(Text, nullable=False)
    option_a = Column(String(500), nullable=False)
    option_b = Column(String(500), nullable=False)
    option_c = Column(String(500), nullable=False)
    option_d = Column(String(500), nullable=False)
    correct_answer = Column(String(1), nullable=False)  # A, B, C, D
    
    explanation = Column(Text, nullable=True)  # AI-generated or manual
    page_reference = Column(String(50), nullable=True)  # "Página 45"
    difficulty = Column(Integer, default=1)  # 1-5
    xp_reward = Column(Integer, default=10)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    entity = relationship("Entity", back_populates="questions")
    profile = relationship("Profile", back_populates="questions")
    topic = relationship("Topic", back_populates="questions")
    material = relationship("Material", back_populates="questions")
    answers = relationship("Answer", back_populates="question")


# ============== STUDY SESSIONS ==============
class StudySession(Base):
    __tablename__ = "study_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mode = Column(SQLEnum(StudyMode), nullable=False)
    entity_id = Column(Integer, ForeignKey("entities.id"), nullable=True)
    
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    time_limit_minutes = Column(Integer, nullable=True)  # For simulacro
    
    total_questions = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    score = Column(Float, nullable=True)
    xp_earned = Column(Integer, default=0)
    
    # Relationships
    user = relationship("User", back_populates="study_sessions")
    answers = relationship("Answer", back_populates="session")


# ============== ANSWERS ==============
class Answer(Base):
    __tablename__ = "answers"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("study_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    
    selected_option = Column(String(1), nullable=False)  # A, B, C, D
    is_correct = Column(Boolean, nullable=False)
    time_spent_seconds = Column(Integer, nullable=True)
    answered_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("StudySession", back_populates="answers")
    user = relationship("User", back_populates="answers")
    question = relationship("Question", back_populates="answers")


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)

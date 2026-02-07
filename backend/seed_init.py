"""
MeritSim - Seed Initialization Script
Creates initial database tables and admin users
"""
import os
import sys
from datetime import datetime
from passlib.context import CryptContext

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import (
    Base, engine, SessionLocal, 
    User, UserRole, Entity, Profile, Topic, Question
)
from study_content import ALL_QUESTIONS

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def seed_admin_users(db):
    """Create the 3 admin users"""
    admin_users = [
        {
            "email": os.getenv("ADMIN_EMAIL_1", "admin@admin.com"),
            "password": os.getenv("ADMIN_PASS_1", "admin_password"),
            "full_name": "Administrador Principal"
        },
        {
            "email": os.getenv("ADMIN_EMAIL_2", "email2@example.com"),
            "password": os.getenv("ADMIN_PASS_2", "secure_password_2"),
            "full_name": "Carlos Madero"
        },
        {
            "email": os.getenv("ADMIN_EMAIL_3", "email3@example.com"),
            "password": os.getenv("ADMIN_PASS_3", "secure_password_3"),
            "full_name": "VP Admin"
        }
    ]
    
    for user_data in admin_users:
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if not existing:
            user = User(
                email=user_data["email"],
                hashed_password=hash_password(user_data["password"]),
                full_name=user_data["full_name"],
                role=UserRole.ADMIN,
                is_active=True,
                xp_points=0,
                level=1
            )
            db.add(user)
            print(f"✅ Created admin user: {user_data['email']}")
        else:
            print(f"ℹ️ Admin user already exists: {user_data['email']}")
    
    db.commit()


def seed_entities(db):
    """Create base entities (DIAN, CAR, Acueducto)"""
    entities_data = [
        {
            "name": "DIAN",
            "description": "Dirección de Impuestos y Aduanas Nacionales - Competencias tributarias y aduaneras",
            "icon": "account_balance",
            "color": "#3B82F6"  # Blue
        },
        {
            "name": "CAR",
            "description": "Corporación Autónoma Regional - Competencias ambientales y recursos naturales",
            "icon": "eco",
            "color": "#10B981"  # Green
        },
        {
            "name": "Acueducto",
            "description": "Empresa de Acueducto y Alcantarillado - Servicios públicos",
            "icon": "water_drop",
            "color": "#06B6D4"  # Cyan
        },
        {
            "name": "General",
            "description": "Competencias básicas del estado y conocimientos generales",
            "icon": "school",
            "color": "#8B5CF6"  # Purple
        }
    ]
    
    for entity_data in entities_data:
        existing = db.query(Entity).filter(Entity.name == entity_data["name"]).first()
        if not existing:
            entity = Entity(**entity_data)
            db.add(entity)
            print(f"✅ Created entity: {entity_data['name']}")
        else:
            print(f"ℹ️ Entity already exists: {entity_data['name']}")
    
    db.commit()


def seed_profiles(db):
    """Create job profiles for each entity"""
    profiles_data = [
        # DIAN profiles
        {"entity_name": "DIAN", "name": "Gestor I", "description": "Nivel asistencial DIAN"},
        {"entity_name": "DIAN", "name": "Gestor II", "description": "Nivel técnico DIAN"},
        {"entity_name": "DIAN", "name": "Profesional I", "description": "Nivel profesional junior"},
        {"entity_name": "DIAN", "name": "Profesional II", "description": "Nivel profesional senior"},
        # CAR profiles
        {"entity_name": "CAR", "name": "Técnico Operativo", "description": "Nivel técnico operativo"},
        {"entity_name": "CAR", "name": "Profesional Universitario", "description": "Nivel profesional"},
        {"entity_name": "CAR", "name": "Profesional Especializado", "description": "Nivel especializado"},
        # Acueducto profiles
        {"entity_name": "Acueducto", "name": "Auxiliar Administrativo", "description": "Nivel auxiliar"},
        {"entity_name": "Acueducto", "name": "Técnico", "description": "Nivel técnico"},
        {"entity_name": "Acueducto", "name": "Profesional", "description": "Nivel profesional"},
        # General profiles
        {"entity_name": "General", "name": "Competencias Comportamentales", "description": "Aplica a todas las entidades"},
    ]
    
    for profile_data in profiles_data:
        entity = db.query(Entity).filter(Entity.name == profile_data["entity_name"]).first()
        if entity:
            existing = db.query(Profile).filter(
                Profile.entity_id == entity.id,
                Profile.name == profile_data["name"]
            ).first()
            if not existing:
                profile = Profile(
                    entity_id=entity.id,
                    name=profile_data["name"],
                    description=profile_data["description"]
                )
                db.add(profile)
                print(f"✅ Created profile: {profile_data['name']} ({profile_data['entity_name']})")
    
    db.commit()


def seed_topics(db):
    """Create base topics for questions"""
    topics_data = [
        # Derecho
        {"name": "Derecho Administrativo", "description": "Principios y procedimientos administrativos"},
        {"name": "Constitución Política", "description": "Constitución de Colombia 1991"},
        {"name": "Derecho Tributario", "description": "Impuestos y obligaciones fiscales"},
        {"name": "Derecho Aduanero", "description": "Régimen de aduanas y comercio exterior"},
        {"name": "Derecho Ambiental", "description": "Normativa ambiental colombiana"},
        
        # Specific
        {"name": "IVA", "description": "Impuesto al Valor Agregado"},
        {"name": "Servicios Públicos", "description": "Regulación de servicios públicos domiciliarios"},
        
        # Soft skills
        {"name": "Competencias Comportamentales", "description": "Habilidades blandas y actitudes"},
        {"name": "Ética Pública", "description": "Código de ética del servidor público"},
        {"name": "Gestión Documental", "description": "Manejo de documentos y archivo"},
    ]
    
    for topic_data in topics_data:
        existing = db.query(Topic).filter(Topic.name == topic_data["name"]).first()
        if not existing:
            topic = Topic(**topic_data)
            db.add(topic)
            print(f"✅ Created topic: {topic_data['name']}")
    
    db.commit()


def seed_questions(db):
    """Seed real questions from study_content.py"""
    
    # Load entities and topics cache
    entities = {e.name: e for e in db.query(Entity).all()}
    topics = {t.name: t for t in db.query(Topic).all()}
    
    count = 0
    
    for entity_name, questions in ALL_QUESTIONS.items():
        entity = entities.get(entity_name)
        if not entity:
            print(f"⚠️ Entity not found: {entity_name}")
            continue
            
        print(f"📚 Seeding {len(questions)} questions for {entity_name}...")
        
        for q in questions:
            # Find topic
            topic_name = q.get("topic")
            topic = topics.get(topic_name)
            
            # Create topic if not exists (fallback)
            if topic_name and not topic:
                topic = Topic(name=topic_name, description="Created during seeding")
                db.add(topic)
                db.commit()
                db.refresh(topic)
                topics[topic_name] = topic
                print(f"Permissions Created new topic: {topic_name}")
            
            existing = db.query(Question).filter(Question.text == q["text"]).first()
            if not existing:
                question = Question(
                    entity_id=entity.id,
                    topic_id=topic.id if topic else None,
                    text=q["text"],
                    option_a=q["option_a"],
                    option_b=q["option_b"],
                    option_c=q["option_c"],
                    option_d=q["option_d"],
                    correct_answer=q["correct_answer"],
                    explanation=q["explanation"],
                    difficulty=q["difficulty"],
                    page_reference=q.get("page_reference"),
                    xp_reward=q["difficulty"] * 10
                )
                db.add(question)
                count += 1
    
    db.commit()
    print(f"✅ added {count} new questions to the database!")


def main():
    print("=" * 60)
    print("🚀 MeritSim - Database Initialization")
    print("=" * 60)
    
    # Create tables
    print("\n📦 Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully!")
    
    # Create session
    db = SessionLocal()
    
    try:
        print("\n👤 Seeding admin users...")
        seed_admin_users(db)
        
        print("\n🏛️ Seeding entities...")
        seed_entities(db)
        
        print("\n💼 Seeding profiles...")
        seed_profiles(db)
        
        print("\n📚 Seeding topics...")
        seed_topics(db)
        
        print("\n❓ Seeding exams questions...")
        seed_questions(db)
        
        print("\n" + "=" * 60)
        print("✅ Database initialization complete!")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()

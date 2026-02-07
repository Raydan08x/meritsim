
import os
import json
import logging
import asyncio
from typing import List, Dict
import google.generativeai as genai
from openai import OpenAI
from pypdf import PdfReader
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Import models
from models import SessionLocal, Question, Material, Entity, Profile
from main import get_db

load_dotenv()

# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configure Clients
OPENAI_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_KEY = os.getenv("GEMINI_API_KEY")

openai_client = None
if OPENAI_KEY:
    openai_client = OpenAI(api_key=OPENAI_KEY)
    logger.info("OpenAI Client Configured")

if GEMINI_KEY:
    genai.configure(api_key=GEMINI_KEY)
    logger.info("Gemini Client Configured")

# Determine path based on environment
if os.path.exists("/app/materials"):
    MATERIALS_PATH = "/app/materials"
else:
    MATERIALS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "MATERIAL DE ESTUDIO 2026")

def extract_text_from_pdf(filepath: str, max_pages: int = 100) -> str:
    """Extract text from PDF"""
    try:
        reader = PdfReader(filepath)
        text = ""
        for i, page in enumerate(reader.pages):
            if i >= max_pages:
                break
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"
        return text
    except Exception as e:
        logger.error(f"Error reading PDF {filepath}: {e}")
        return ""

def chunk_text(text: str, chunk_size: int = 15000) -> List[str]:
    """Split text into chunks avoiding mid-sentence breaks if possible"""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        if end >= len(text):
            chunks.append(text[start:])
            break
        
        # Try to find newline or space to break
        breakpoint = text.rfind('\n', start, end)
        if breakpoint == -1 or breakpoint < start + (chunk_size // 2):
            breakpoint = text.rfind(' ', start, end)
        
        if breakpoint == -1:
            breakpoint = end
            
        chunks.append(text[start:breakpoint])
        start = breakpoint + 1
    return chunks

def clean_json_string(s: str) -> str:
    """Clean markdown code blocks from JSON string"""
    s = s.strip()
    if s.startswith("```json"):
        s = s[7:]
    if s.startswith("```"):
        s = s[3:]
    if s.endswith("```"):
        s = s[:-3]
    return s.strip()

def generate_with_openai(chunk: str, entity_name: str, topic: str) -> List[Dict]:
    if not openai_client: return []
    try:
        prompt = f"""
        Generate 5 multiple-choice questions (Spanish) based on this text about '{topic}' for '{entity_name}'.
        Focus on creating challenging, scenario-based questions suitable for a professional exam.
        
        Format: JSON Array
        Items: {{ "question": str, "options": [str, str, str, str], "correct_answer": str, "explanation": str, "difficulty": int (1-3) }}
        
        Text: {chunk[:8000]}...
        """
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo-1106", # Faster/Cheaper for bulk
            messages=[
                {"role": "system", "content": "You are an expert exam creator for Colombian public service exams. Output JSON only."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        data = json.loads(response.choices[0].message.content)
        return data.get("questions", data) if isinstance(data, dict) else data
    except Exception as e:
        logger.error(f"OpenAI error: {e}")
        return []

def generate_with_gemini(chunk: str, entity_name: str, topic: str) -> List[Dict]:
    if not GEMINI_KEY: return []
    try:
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"""
        Act as an expert exam creator for {entity_name}.
        Generate 5 multiple-choice questions in Spanish based on the following text.
        Topic: {topic}
        
        Requirements:
        1. Questions must be relevant to the text.
        2. Provide 4 options.
        3. Indicate correct answer (must match one option exactly).
        4. Detailed explanation.
        5. Difficulty 1 (Basic) to 3 (Hard).
        
        Output strictly valid JSON array.
        Structure: [{{ "question": "...", "options": ["A","B","C","D"], "correct_answer": "A", "explanation": "...", "difficulty": 2 }}]

        Text:
        {chunk[:10000]}
        """
        response = model.generate_content(prompt)
        text_resp = clean_json_string(response.text)
        return json.loads(text_resp)
    except Exception as e:
        logger.error(f"Gemini error: {e}")
        return []

def process_file(db: Session, filepath: str, entity_id: int, profile_id: int):
    filename = os.path.basename(filepath)
    topic = os.path.splitext(filename)[0]
    
    logger.info(f"Analyzing {filename}...")
    text = extract_text_from_pdf(filepath)
    if not text:
        logger.warning(f"No text extracted from {filename}")
        return

    chunks = chunk_text(text)
    logger.info(f"Split {filename} into {len(chunks)} chunks.")
    
    # Get Entity Name
    entity = db.query(Entity).get(entity_id)
    entity_name = entity.name if entity else "General"
    
    total_saved = 0
    
    # Determine providers
    providers = []
    if openai_client: providers.append("openai")
    if GEMINI_KEY: providers.append("gemini")
    
    if not providers:
        logger.error("No AI providers configured (OPENAI_API_KEY or GEMINI_API_KEY needed).")
        return

    for i, chunk in enumerate(chunks):
        provider = providers[i % len(providers)] # Alternate
        logger.info(f"Processing chunk {i+1}/{len(chunks)} with {provider}...")
        
        questions = []
        if provider == "openai":
            questions = generate_with_openai(chunk, entity_name, topic)
        else:
            questions = generate_with_gemini(chunk, entity_name, topic)
            
        if not questions:
            continue
            
        # Save questions
        saved_chunk = 0
        for q in questions:
            try:
                # Validation
                if not isinstance(q, dict) or "options" not in q or len(q["options"]) != 4:
                    continue
                    
                new_q = Question(
                    entity_id=entity_id,
                    profile_id=profile_id,
                    question_text=q["question"],
                    option_a=q["options"][0],
                    option_b=q["options"][1],
                    option_c=q["options"][2],
                    option_d=q["options"][3],
                    correct_answer=q["correct_answer"],
                    explanation_text=q.get("explanation", ""),
                    difficulty=int(q.get("difficulty", 2)),
                    topic=topic,
                    is_active=True
                )
                db.add(new_q)
                saved_chunk += 1
            except Exception as e:
                logger.error(f"Save error: {e}")
        
        db.commit()
        total_saved += saved_chunk
        logger.info(f"Saved {saved_chunk} questions from chunk {i+1}")

    logger.info(f"Finished {filename}: {total_saved} total questions.")

def main():
    logger.info("Starting Multi-LLM Question Generator...")
    if not os.path.exists(MATERIALS_PATH):
        logger.error(f"Materials path not found: {MATERIALS_PATH}")
        return

    db = SessionLocal()
    
    # Recursive scan
    for root, dirs, files in os.walk(MATERIALS_PATH):
        rel_path = os.path.relpath(root, MATERIALS_PATH)
        parts = rel_path.split(os.sep)
        
        entity_id = None
        profile_id = None
        
        # Infer Entity/Profile logic same as indexer
        if len(parts) >= 1 and parts[0] != ".":
            ent_name = parts[0]
            entity = db.query(Entity).filter(Entity.name.ilike(f"%{ent_name}%")).first()
            if entity:
                entity_id = entity.id
                if len(parts) >= 2:
                    prof_name = parts[1]
                    profile = db.query(Profile).filter(Profile.entity_id == entity.id, Profile.name == prof_name).first()
                    if profile:
                        profile_id = profile.id
        
        for file in files:
            if file.lower().endswith(".pdf"):
                full_path = os.path.join(root, file)
                # Only process if we identified at least an entity, or if user wants general ingestion
                # For now let's be permissive? Or strict? 
                # If entity_id is None, maybe skip or assign to General?
                if entity_id:
                    process_file(db, full_path, entity_id, profile_id)
                else:
                    logger.warning(f"Skipping {file} (No entity identified in path)")
    
    db.close()
    logger.info("Generation Complete.")

if __name__ == "__main__":
    main()

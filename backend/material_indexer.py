"""
MeritSim - Material Indexer Service
Scans and catalogs PDFs from the study materials folder
"""
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict
from models import SessionLocal, Material, Entity, Profile

# Determine path based on environment
if os.path.exists("/app/materials"):
    MATERIALS_PATH = "/app/materials"
else:
    MATERIALS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "MATERIAL DE ESTUDIO 2026")


def get_entity_by_folder_name(db, folder_name: str) -> Optional[Entity]:
    """Find entity by folder name (case-insensitive)"""
    return db.query(Entity).filter(
        Entity.name.ilike(f"%{folder_name}%")
    ).first()


def get_or_create_profile(db, entity_id: int, profile_name: str) -> Profile:
    """Get existing profile or create new one"""
    profile = db.query(Profile).filter(
        Profile.entity_id == entity_id,
        Profile.name == profile_name
    ).first()
    
    if not profile:
        profile = Profile(
            entity_id=entity_id,
            name=profile_name,
            description=f"Perfil {profile_name} creado automáticamente"
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        print(f"  📁 Created new profile: {profile_name}")
    
    return profile


def get_file_info(filepath: str) -> Dict:
    """Get file metadata"""
    stat = os.stat(filepath)
    return {
        "size": stat.st_size,
        "modified": datetime.fromtimestamp(stat.st_mtime)
    }


def index_materials(materials_path: str = MATERIALS_PATH) -> Dict:
    """
    Scan the materials folder and index all PDFs.
    
    Folder structure expected:
    MATERIAL DE ESTUDIO 2026/
    ├── DIAN/               <- Entity (Level 1)
    │   └── Gestor I/       <- Profile (Level 2)
    │       └── doc.pdf
    └── CAR/
        └── Profesional/
            └── normativa.pdf
    """
    print("=" * 60)
    print("📚 MeritSim - Material Indexer")
    print("=" * 60)
    
    if not os.path.exists(materials_path):
        print(f"⚠️ Materials folder not found: {materials_path}")
        return {"status": "error", "message": "Materials folder not found", "indexed": 0}
    
    db = SessionLocal()
    stats = {
        "total_files": 0,
        "indexed": 0,
        "skipped": 0,
        "errors": 0,
        "entities_found": set(),
        "profiles_created": 0
    }
    
    try:
        # Walk through the materials directory
        for root, dirs, files in os.walk(materials_path):
            # Calculate relative path from materials root
            rel_path = os.path.relpath(root, materials_path)
            path_parts = rel_path.split(os.sep) if rel_path != "." else []
            
            # Process PDF files
            pdf_files = [f for f in files if f.lower().endswith('.pdf')]
            
            for filename in pdf_files:
                stats["total_files"] += 1
                filepath = os.path.join(root, filename)
                relative_filepath = os.path.relpath(filepath, materials_path)
                
                print(f"\n📄 Processing: {relative_filepath}")
                
                # Check if already indexed
                existing = db.query(Material).filter(
                    Material.filepath == relative_filepath
                ).first()
                
                if existing:
                    print(f"  ⏭️ Already indexed, skipping")
                    stats["skipped"] += 1
                    continue
                
                try:
                    # Determine entity and profile from folder structure
                    entity_id = None
                    profile_id = None
                    
                    if len(path_parts) >= 1:
                        # Level 1: Entity
                        entity_folder = path_parts[0]
                        entity = get_entity_by_folder_name(db, entity_folder)
                        
                        if entity:
                            entity_id = entity.id
                            stats["entities_found"].add(entity.name)
                            print(f"  🏛️ Entity: {entity.name}")
                            
                            if len(path_parts) >= 2:
                                # Level 2: Profile
                                profile_name = path_parts[1]
                                profile = get_or_create_profile(db, entity.id, profile_name)
                                profile_id = profile.id
                                print(f"  👤 Profile: {profile.name}")
                    
                    # Get file info
                    file_info = get_file_info(filepath)
                    
                    # Create material record
                    material = Material(
                        entity_id=entity_id,
                        profile_id=profile_id,
                        filename=filename,
                        filepath=relative_filepath,
                        title=os.path.splitext(filename)[0],  # Use filename as title
                        file_size=file_info["size"],
                        indexed_at=datetime.utcnow()
                    )
                    
                    db.add(material)
                    db.commit()
                    
                    stats["indexed"] += 1
                    print(f"  ✅ Indexed successfully ({file_info['size']} bytes)")
                    
                except Exception as e:
                    print(f"  ❌ Error indexing: {e}")
                    stats["errors"] += 1
                    db.rollback()
        
        print("\n" + "=" * 60)
        print("📊 Indexing Summary")
        print("=" * 60)
        print(f"  Total PDFs found: {stats['total_files']}")
        print(f"  Newly indexed: {stats['indexed']}")
        print(f"  Already indexed (skipped): {stats['skipped']}")
        print(f"  Errors: {stats['errors']}")
        print(f"  Entities detected: {', '.join(stats['entities_found']) or 'None'}")
        print("=" * 60)
        
        return {
            "status": "success",
            "total_files": stats["total_files"],
            "indexed": stats["indexed"],
            "skipped": stats["skipped"],
            "errors": stats["errors"],
            "entities": list(stats["entities_found"])
        }
        
    except Exception as e:
        print(f"❌ Fatal error during indexing: {e}")
        db.rollback()
        return {"status": "error", "message": str(e), "indexed": 0}
    
    finally:
        db.close()


def get_materials_by_entity(entity_name: str) -> List[Dict]:
    """Get all materials for a specific entity"""
    db = SessionLocal()
    try:
        entity = db.query(Entity).filter(Entity.name.ilike(f"%{entity_name}%")).first()
        if not entity:
            return []
        
        materials = db.query(Material).filter(
            Material.entity_id == entity.id
        ).all()
        
        return [
            {
                "id": m.id,
                "filename": m.filename,
                "filepath": m.filepath,
                "title": m.title,
                "profile": m.profile.name if m.profile else None,
                "file_size": m.file_size,
                "indexed_at": m.indexed_at.isoformat() if m.indexed_at else None
            }
            for m in materials
        ]
    finally:
        db.close()


def suggest_materials_for_user(user_id: int, limit: int = 5) -> List[Dict]:
    """
    Suggest materials based on user's recent wrong answers.
    Returns materials related to topics where user struggles.
    """
    from models import Answer, Question
    
    db = SessionLocal()
    try:
        # Get user's recent wrong answers
        wrong_answers = db.query(Answer).filter(
            Answer.user_id == user_id,
            Answer.is_correct == False
        ).order_by(Answer.answered_at.desc()).limit(20).all()
        
        if not wrong_answers:
            # Return random materials if no wrong answers
            materials = db.query(Material).limit(limit).all()
        else:
            # Get entity IDs from wrong answers
            entity_ids = set()
            for answer in wrong_answers:
                if answer.question and answer.question.entity_id:
                    entity_ids.add(answer.question.entity_id)
            
            # Get materials from those entities
            materials = db.query(Material).filter(
                Material.entity_id.in_(entity_ids)
            ).limit(limit).all()
        
        return [
            {
                "id": m.id,
                "filename": m.filename,
                "filepath": m.filepath,
                "title": m.title,
                "entity": m.entity.name if m.entity else None,
                "profile": m.profile.name if m.profile else None,
                "reason": "Bajo rendimiento en esta área"
            }
            for m in materials
        ]
    finally:
        db.close()


if __name__ == "__main__":
    # Run indexer directly
    result = index_materials()
    print(f"\nResult: {result}")

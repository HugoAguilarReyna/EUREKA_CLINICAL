#!/usr/bin/env python3
"""
AUTO-PATCH SCRIPT for knowledge_routes.py
Automatically adds missing endpoints and fixes route ordering.

USAGE:
    python patch_knowledge_routes.py

WARNING:
    This will modify your knowledge_routes.py file!
    A backup will be created first.
"""

import os
import sys
from pathlib import Path
from datetime import datetime

# Configuration
ROUTES_FILE = "backend/api/knowledge_routes.py"
BACKUP_SUFFIX = ".backup"

MISSING_ENDPOINTS = '''
# ============================================================================
# [PATCHED BY EPIC 10.0B] Missing endpoints added by auto-patch script
# ============================================================================

@router.post("/initialize")
async def initialize_system() -> Dict[str, Any]:
    """Initialize the knowledge system at startup."""
    try:
        from mongo_index_manager import MongoIndexManager
        
        logger.info("Initializing knowledge system...")
        
        # Create MongoDB indexes
        index_manager = MongoIndexManager(mongo_db)
        index_results = index_manager.create_all_indexes()
        logger.info(f"Indexes created: {index_results}")
        
        # Verify Neo4j connection
        try:
            neo4j_check = neo4j_session.run("RETURN 'Neo4j OK' AS status").single()
            neo4j_status = "connected"
        except Exception as e:
            logger.warning(f"Neo4j connection check failed: {e}")
            neo4j_status = "error"
        
        # Verify MongoDB connection
        try:
            mongo_db.command("ping")
            mongo_status = "connected"
        except Exception as e:
            logger.warning(f"MongoDB connection check failed: {e}")
            mongo_status = "error"
        
        return {
            "status": "initialized",
            "neo4j": neo4j_status,
            "mongo": mongo_status,
            "indexes": index_results,
            "timestamp": datetime.now().isoformat(),
        }
    
    except Exception as e:
        logger.error(f"Initialization failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Initialization failed: {str(e)}")


@router.get("/system/indexes")
async def get_index_stats() -> Dict[str, Any]:
    """Get MongoDB index statistics."""
    try:
        from mongo_index_manager import MongoIndexManager
        
        index_manager = MongoIndexManager(mongo_db)
        return index_manager.get_index_stats()
    
    except Exception as e:
        logger.error(f"Failed to get index stats: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# CRITICAL: This must come BEFORE /jobs/{job_id}
@router.get("/jobs/summary")
async def get_jobs_summary() -> Dict[str, Any]:
    """Get a summary of all background jobs."""
    try:
        # Get background job manager from FastAPI routes instance
        bg_manager = get_bg_job_manager()
        # Return manual summary since get_job_summary doesn't exist yet
        collection = bg_manager.jobs_collection
        queued = collection.count_documents({"status": "queued"})
        running = collection.count_documents({"status": "running"})
        completed = collection.count_documents({"status": "completed"})
        failed = collection.count_documents({"status": "failed"})
        
        return {
            "queued": queued,
            "running": running,
            "completed": completed,
            "failed": failed
        }
    except Exception as e:
        # logger.error(f"Failed to get job summary: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


'''

def check_file_exists():
    """Check if knowledge_routes.py exists."""
    if not os.path.exists(ROUTES_FILE):
        print(f"❌ File not found: {ROUTES_FILE}")
        print(f"   Current directory: {os.getcwd()}")
        print(f"   Please run this from your project root directory")
        sys.exit(1)
    print(f"✓ Found: {ROUTES_FILE}")

def create_backup():
    """Create a backup of the original file."""
    backup_file = ROUTES_FILE + BACKUP_SUFFIX
    
    if os.path.exists(backup_file):
        print(f"⚠ Backup already exists: {backup_file}")
    
    with open(ROUTES_FILE, 'r') as f:
        content = f.read()
    
    with open(backup_file, 'w') as f:
        f.write(content)
    
    print(f"✓ Backup created: {backup_file}")
    return backup_file

def check_endpoints_exist(content):
    """Check if endpoints are already present."""
    endpoints = {
        "/initialize": "@router.post(\"/initialize\")" in content,
        "/system/indexes": "@router.get(\"/system/indexes\")" in content,
        "/jobs/summary": "@router.get(\"/jobs/summary\")" in content,
    }
    
    missing = [ep for ep, exists in endpoints.items() if not exists]
    
    if missing:
        print(f"❌ Missing endpoints: {', '.join(missing)}")
        return missing
    else:
        print("✓ All endpoints already exist!")
        return []

def check_imports(content):
    """Check if required imports are present."""
    required_imports = [
        ("Dict", "from typing import Dict, Any"),
        ("datetime", "from datetime import datetime"),
    ]
    
    missing_imports = []
    
    for name, import_line in required_imports:
        if name not in content:
            missing_imports.append(import_line)
    
    return missing_imports

def add_imports(content, missing_imports):
    """Add missing imports to the file."""
    if not missing_imports:
        return content
    
    # Find the last import line
    lines = content.split('\n')
    last_import_idx = -1
    
    for i, line in enumerate(lines):
        if line.startswith('from ') or line.startswith('import '):
            last_import_idx = i
    
    if last_import_idx == -1:
        print("⚠ Could not find import section, adding to top")
        last_import_idx = 0
    
    # Insert new imports
    for imp in missing_imports:
        lines.insert(last_import_idx + 1, imp)
        print(f"  + Added: {imp}")
    
    return '\n'.join(lines)

def find_router_definition(content):
    """Find where the router is defined."""
    for i, line in enumerate(content.split('\n')):
        if 'router = APIRouter(' in line:
            return i
    return -1

def find_first_dynamic_route(content):
    """Find the first @router.get("/jobs/{job_id}" route."""
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if '@router.get("/jobs/{job_id' in line or '@router.get("/jobs/{' in line:
            return i
    return -1

def add_endpoints(content):
    """Add the missing endpoints."""
    lines = content.split('\n')
    
    # Find where to insert (before /jobs/{job_id})
    insert_idx = find_first_dynamic_route(content)
    
    if insert_idx == -1:
        # If no dynamic route found, find router definition and add after it
        router_idx = find_router_definition(content)
        if router_idx == -1:
            print("❌ Could not find where to insert endpoints!")
            return content
        
        # Find the first route after router definition
        for i in range(router_idx + 1, len(lines)):
            if lines[i].startswith('@router.'):
                insert_idx = i
                break
    
    if insert_idx != -1:
        # Insert new endpoints
        new_lines = lines[:insert_idx] + MISSING_ENDPOINTS.split('\n') + lines[insert_idx:]
        print(f"✓ Endpoints inserted at line {insert_idx}")
        return '\n'.join(new_lines)
    
    return content

def verify_changes(original, modified):
    """Verify that changes were made correctly."""
    orig_lines = original.split('\n')
    mod_lines = modified.split('\n')
    
    added_lines = len(mod_lines) - len(orig_lines)
    
    print(f"✓ {added_lines} lines added")
    print(f"✓ Original: {len(orig_lines)} lines")
    print(f"✓ Modified: {len(mod_lines)} lines")

def apply_patch():
    """Apply the patch to knowledge_routes.py"""
    print("\n" + "="*70)
    print("EPIC 10.0B — AUTO-PATCH SCRIPT")
    print("="*70 + "\n")
    
    # Step 1: Check file exists
    print("Step 1: Checking file exists...")
    check_file_exists()
    
    # Step 2: Read original content
    print("\nStep 2: Reading file...")
    with open(ROUTES_FILE, 'r') as f:
        original_content = f.read()
    
    # Step 3: Create backup
    print("\nStep 3: Creating backup...")
    backup = create_backup()
    
    # Step 4: Check what's missing
    print("\nStep 4: Checking what's missing...")
    missing_endpoints = check_endpoints_exist(original_content)
    missing_imports = check_imports(original_content)
    
    if not missing_endpoints and not missing_imports:
        print("\n✓ No patches needed! File is already complete.")
        return True
    
    # Step 5: Apply patches
    print("\nStep 5: Applying patches...")
    
    modified_content = original_content
    
    if missing_imports:
        print("  Adding imports:")
        modified_content = add_imports(modified_content, missing_imports)
    
    if missing_endpoints:
        print("  Adding endpoints:")
        modified_content = add_endpoints(modified_content)
    
    # Step 6: Verify
    print("\nStep 6: Verifying changes...")
    verify_changes(original_content, modified_content)
    
    # Step 7: Write file
    print("\nStep 7: Writing file...")
    with open(ROUTES_FILE, 'w') as f:
        f.write(modified_content)
    print(f"✓ File updated: {ROUTES_FILE}")
    
    print("\n" + "="*70)
    print("✓ PATCH APPLIED SUCCESSFULLY")
    print("="*70)
    
    return True

if __name__ == "__main__":
    try:
        apply_patch()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

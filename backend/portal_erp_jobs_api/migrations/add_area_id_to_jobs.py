"""
Migration script to add area_id column to jobs table
and migrate existing area text data to area_id foreign key
"""
import sqlite3
import os
import sys

def run_migration(db_path=None):
    """Run the migration to add area_id to jobs table"""
    
    # Database path - use provided path or default
    if not db_path:
        db_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'app.db')
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return False
    
    print(f"Running migration on: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if area_id column already exists
        cursor.execute("PRAGMA table_info(jobs)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'area_id' in columns:
            print("Column 'area_id' already exists in jobs table")
        else:
            # Add area_id column
            print("Adding 'area_id' column to jobs table...")
            cursor.execute("ALTER TABLE jobs ADD COLUMN area_id INTEGER REFERENCES job_areas(id)")
            print("Column 'area_id' added successfully")
        
        # Get mapping of area names to area_ids
        cursor.execute("SELECT id, name FROM job_areas")
        areas = cursor.fetchall()
        area_mapping = {name.lower(): id for id, name in areas}
        
        print(f"\nArea mapping: {area_mapping}")
        
        # Get jobs with area text but no area_id
        cursor.execute("SELECT id, area FROM jobs WHERE area IS NOT NULL AND (area_id IS NULL OR area_id = 0)")
        jobs_to_update = cursor.fetchall()
        
        print(f"\nFound {len(jobs_to_update)} jobs to update")
        
        # Update jobs with matching area_id
        updated_count = 0
        for job_id, area_text in jobs_to_update:
            if area_text:
                area_lower = area_text.lower().strip()
                
                # Try exact match first
                if area_lower in area_mapping:
                    area_id = area_mapping[area_lower]
                    cursor.execute("UPDATE jobs SET area_id = ? WHERE id = ?", (area_id, job_id))
                    updated_count += 1
                    print(f"  Updated job {job_id}: '{area_text}' -> area_id={area_id}")
                else:
                    # Try partial match
                    matched = False
                    for area_name, area_id in area_mapping.items():
                        if area_lower in area_name or area_name in area_lower:
                            cursor.execute("UPDATE jobs SET area_id = ? WHERE id = ?", (area_id, job_id))
                            updated_count += 1
                            print(f"  Updated job {job_id}: '{area_text}' -> area_id={area_id} (partial match with '{area_name}')")
                            matched = True
                            break
                    
                    if not matched:
                        print(f"  No match found for job {job_id}: '{area_text}'")
        
        conn.commit()
        print(f"\nMigration completed. Updated {updated_count} jobs.")
        
        # Show final state
        cursor.execute("SELECT id, title, area, area_id FROM jobs LIMIT 10")
        jobs = cursor.fetchall()
        print("\nSample jobs after migration:")
        for job in jobs:
            print(f"  ID={job[0]}, Title='{job[1]}', Area='{job[2]}', Area_ID={job[3]}")
        
        return True
        
    except Exception as e:
        print(f"Migration error: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    # Allow passing db_path as argument
    db_path = sys.argv[1] if len(sys.argv) > 1 else None
    run_migration(db_path)

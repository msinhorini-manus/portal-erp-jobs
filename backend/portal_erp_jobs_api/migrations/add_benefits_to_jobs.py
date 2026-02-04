#!/usr/bin/env python3
"""
Migration script to add benefits column to jobs table
"""
import sqlite3
import sys

def migrate(db_path):
    """Add benefits column to jobs table"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(jobs)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'benefits' not in columns:
            print("Adding 'benefits' column to jobs table...")
            cursor.execute("ALTER TABLE jobs ADD COLUMN benefits TEXT")
            conn.commit()
            print("Column 'benefits' added successfully!")
        else:
            print("Column 'benefits' already exists.")
        
        # Verify the change
        cursor.execute("PRAGMA table_info(jobs)")
        columns = cursor.fetchall()
        print("\nCurrent jobs table structure:")
        for col in columns:
            print(f"  {col[1]} ({col[2]})")
            
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    db_path = sys.argv[1] if len(sys.argv) > 1 else "database/app.db"
    migrate(db_path)

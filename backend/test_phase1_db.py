"""
Phase 1 Database Verification Script
Tests schema creation, table definitions, relationships, and basic insertions for RecallAI.
"""
import sys
from datetime import datetime, timezone
from sqlalchemy import inspect
from app.db.session import engine, SessionLocal, init_db
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message, MessageRole
from app.models.memory import Memory, MemoryType, MemoryStatus
from app.core.logging import logger


def verify_phase_1():
    print("==================================================")
    print("RecallAI - Phase 1: Database & Model Verification")
    print("==================================================")

    # Step 1: Initialize database schema
    print("\n1. Initializing database schema...")
    init_db()

    # Step 2: Inspect created tables
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tables detected in database: {tables}")

    required_tables = ["users", "conversations", "messages", "memories"]
    missing = [t for t in required_tables if t not in tables]
    if missing:
        print(f"[FAIL] Missing tables: {missing}")
        sys.exit(1)
    print("[SUCCESS] All required tables are present.")

    # Inspect columns of each table
    for table in required_tables:
        cols = [c["name"] for c in inspector.get_columns(table)]
        print(f"   - {table}: {', '.join(cols)}")

    # Step 3: Test database transactions and relationships
    print("\n2. Testing data insertion & relationships...")
    db = SessionLocal()
    try:
        # Create Demo User: Rahul
        demo_user = db.query(User).filter(User.email == "rahul@example.com").first()
        if not demo_user:
            demo_user = User(
                email="rahul@example.com",
                name="Rahul",
                hashed_password="hashed_demo_password"
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)
            print(f"[SUCCESS] Created demo user: {demo_user.name} ({demo_user.id})")
        else:
            print(f"[INFO] Demo user already exists: {demo_user.name} ({demo_user.id})")

        # Create Conversation
        conv = Conversation(
            user_id=demo_user.id,
            title="Initial Setup Discussion"
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)
        print(f"[SUCCESS] Created conversation: '{conv.title}' ({conv.id})")

        # Create Message
        msg = Message(
            conversation_id=conv.id,
            role=MessageRole.USER,
            content="I'm building my backend using FastAPI and PostgreSQL."
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        print(f"[SUCCESS] Created message: '{msg.content}' ({msg.role.value if hasattr(msg.role, 'value') else msg.role})")

        # Create Memory with 1536-dim dummy vector
        dummy_vector = [0.01 * (i % 10) for i in range(1536)]
        mem = Memory(
            user_id=demo_user.id,
            content="User is building backend using FastAPI and PostgreSQL.",
            memory_type=MemoryType.SKILL,
            importance_score=0.85,
            confidence_score=0.95,
            embedding=dummy_vector,
            status=MemoryStatus.ACTIVE,
            source_message_id=msg.id
        )
        db.add(mem)
        db.commit()
        db.refresh(mem)
        print(f"[SUCCESS] Created memory: '{mem.content}' (type={mem.memory_type.value}, status={mem.status.value})")

        # Query and verify memory with relationships
        queried_mem = db.query(Memory).filter(Memory.id == mem.id).first()
        assert queried_mem is not None, "Memory not found"
        assert queried_mem.user.email == "rahul@example.com", "User relationship failed"
        assert queried_mem.source_message.content == msg.content, "Source message relationship failed"
        print(f"[SUCCESS] Verified relationships: User -> {queried_mem.user.name}, Message -> '{queried_mem.source_message.content}'")

        print("\nPhase 1 Database Verification PASSED SUCCESSFULLY!")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error during verification: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    verify_phase_1()

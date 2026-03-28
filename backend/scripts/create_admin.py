"""Create the admin user for Sentinel.

Usage:
    docker compose exec backend python scripts/create_admin.py
"""
from __future__ import annotations

import asyncio
import getpass
import sys
from pathlib import Path

# Ensure app is importable
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.user import User


async def main() -> None:
    email = input("Admin email: ").strip().lower()
    if not email:
        print("Email cannot be empty.")
        sys.exit(1)

    password = getpass.getpass("Password: ")
    if len(password) < 8:
        print("Password must be at least 8 characters.")
        sys.exit(1)

    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        print("Passwords do not match.")
        sys.exit(1)

    async with SessionLocal() as db:
        existing = await db.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none():
            print(f"User {email} already exists.")
            sys.exit(1)

        user = User(email=email, password_hash=hash_password(password))
        db.add(user)
        await db.commit()
        print(f"Admin user {email} created successfully.")


if __name__ == "__main__":
    asyncio.run(main())

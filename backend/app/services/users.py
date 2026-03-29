from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user import User


async def get_user(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()


async def list_users(db: AsyncSession) -> list[User]:
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return list(result.scalars().all())


async def create_user(
    db: AsyncSession, email: str, password: str, is_admin: bool = False
) -> User:
    user = User(
        email=email.lower(),
        password_hash=hash_password(password),
        is_admin=is_admin,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user(
    db: AsyncSession, user: User, *, is_active: bool | None = None, is_admin: bool | None = None
) -> User:
    if is_active is not None:
        user.is_active = is_active
    if is_admin is not None:
        user.is_admin = is_admin
    await db.commit()
    await db.refresh(user)
    return user


async def update_user_password(db: AsyncSession, user: User, new_password: str) -> User:
    user.password_hash = hash_password(new_password)
    await db.commit()
    await db.refresh(user)
    return user

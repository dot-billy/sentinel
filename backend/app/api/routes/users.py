from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_admin_user, get_db
from app.models.user import User
from app.schemas.users import AdminUserResponse, ChangePassword, UserCreate, UserUpdate
from app.services.users import (
    create_user,
    get_user,
    get_user_by_email,
    list_users,
    update_user,
    update_user_password,
)

router = APIRouter(prefix="/v1/users", tags=["users"])


@router.get("", response_model=list[AdminUserResponse])
async def list_all_users(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> list[User]:
    return await list_users(db)


@router.post("", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
async def create_new_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> User:
    existing = await get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
    return await create_user(db, body.email, body.password, body.is_admin)


@router.patch("/{user_id}", response_model=AdminUserResponse)
async def update_existing_user(
    user_id: uuid.UUID,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
) -> User:
    target = await get_user(db, user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Prevent admin from deactivating or de-admining themselves
    if target.id == admin.id:
        if body.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate yourself"
            )
        if body.is_admin is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove your own admin role"
            )

    return await update_user(db, target, is_active=body.is_active, is_admin=body.is_admin)


@router.post("/{user_id}/change-password", response_model=AdminUserResponse)
async def change_user_password(
    user_id: uuid.UUID,
    body: ChangePassword,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_admin_user),
) -> User:
    target = await get_user(db, user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return await update_user_password(db, target, body.new_password)

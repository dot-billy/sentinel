from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.security import generate_api_key, hash_api_key
from app.db.session import get_db
from app.models.api_key import ApiKey
from app.models.host import Host
from app.schemas.api_keys import ApiKeyCreate, ApiKeyCreated, ApiKeyResponse

router = APIRouter(prefix="/v1/api-keys", tags=["api-keys"])


@router.get("", response_model=list[ApiKeyResponse])
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> list[ApiKeyResponse]:
    result = await db.execute(
        select(ApiKey).options(selectinload(ApiKey.host)).order_by(ApiKey.created_at.desc())
    )
    keys = result.scalars().all()
    return [
        ApiKeyResponse(
            id=k.id,
            name=k.name,
            key_prefix=k.key_prefix,
            host_id=k.host_id,
            host_name=k.host.name if k.host else None,
            is_active=k.is_active,
            created_at=k.created_at,
        )
        for k in keys
    ]


@router.post("", response_model=ApiKeyCreated, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    body: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> ApiKeyCreated:
    if body.host_id:
        host = await db.execute(select(Host).where(Host.id == body.host_id))
        if not host.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Host not found")

    raw_key = generate_api_key()
    key_obj = ApiKey(
        name=body.name,
        key_hash=hash_api_key(raw_key),
        key_prefix=raw_key[:12],
        host_id=body.host_id,
    )
    db.add(key_obj)
    await db.commit()
    await db.refresh(key_obj)

    host_name = None
    if key_obj.host_id:
        host_result = await db.execute(select(Host.name).where(Host.id == key_obj.host_id))
        host_name = host_result.scalar_one_or_none()

    return ApiKeyCreated(
        id=key_obj.id,
        name=key_obj.name,
        key_prefix=key_obj.key_prefix,
        host_id=key_obj.host_id,
        host_name=host_name,
        is_active=key_obj.is_active,
        created_at=key_obj.created_at,
        key=raw_key,
    )


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    key_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
) -> None:
    result = await db.execute(select(ApiKey).where(ApiKey.id == key_id))
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")

    key.is_active = False
    await db.commit()

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)
from app.models.user import User
from app.schemas.auth import (
    AccessTokenOnly,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
    UserOut,
)
from app.services.auth_service import authenticate_user, register_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _token_pair_for(user: User) -> TokenPair:
    sub = str(user.id)
    return TokenPair(
        access_token=create_access_token({"sub": sub}),
        refresh_token=create_refresh_token({"sub": sub}),
    )


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)) -> TokenPair:
    user = await register_user(db, payload)
    return _token_pair_for(user)


@router.post("/login", response_model=TokenPair)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenPair:
    user = await authenticate_user(db, payload.email, payload.password)
    return _token_pair_for(user)


@router.post("/refresh", response_model=AccessTokenOnly)
async def refresh(payload: RefreshRequest) -> AccessTokenOnly:
    claims = decode_token(payload.refresh_token, expected_type="refresh")
    return AccessTokenOnly(access_token=create_access_token({"sub": claims["sub"]}))


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user

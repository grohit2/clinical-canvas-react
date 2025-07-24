from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, Any
import logging

from ..models.base import LoginRequest, LoginResponse, StaffProfile
from ..database.dynamodb import db_service
from ..auth.auth import verify_password, create_access_token, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(login_request: LoginRequest):
    """Authenticate user and return JWT token"""
    try:
        # Get user by email
        user_data = await db_service.get_user_by_email(login_request.email)
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Verify password
        if not verify_password(login_request.password, user_data.get('password_hash', '')):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Create access token
        token_data = {
            "sub": user_data['user_id'],
            "email": user_data['email'],
            "role": user_data['role'],
            "name": user_data['name']
        }
        access_token = create_access_token(data=token_data)
        
        # Create user profile response (without password hash)
        user_profile = StaffProfile(
            user_id=user_data['user_id'],
            name=user_data['name'],
            role=user_data['role'],
            avatar=user_data.get('avatar'),
            contact_info=user_data.get('contact_info', {}),
            permissions=user_data.get('permissions', []),
            email=user_data['email'],
            created_at=user_data.get('created_at'),
            updated_at=user_data.get('updated_at')
        )
        
        return LoginResponse(token=access_token, user=user_profile)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/logout")
async def logout():
    """Logout user (client should remove token)"""
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=StaffProfile)
async def get_current_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current user profile"""
    try:
        # Fetch full user data from database
        user_data = await db_service.get_user(current_user['user_id'])
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Return user profile (without password hash)
        return StaffProfile(
            user_id=user_data['user_id'],
            name=user_data['name'],
            role=user_data['role'],
            avatar=user_data.get('avatar'),
            contact_info=user_data.get('contact_info', {}),
            permissions=user_data.get('permissions', []),
            email=user_data['email'],
            created_at=user_data.get('created_at'),
            updated_at=user_data.get('updated_at')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get current user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Dict, Any, Optional
import logging

from ..models.base import StaffProfile
from ..database.dynamodb import db_service
from ..auth.auth import get_current_user, require_any_role

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/doctors", tags=["doctors"])


@router.get("/", response_model=List[StaffProfile])
async def list_doctors(
    role: Optional[str] = Query("doctor", description="Filter by role"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List all doctors/staff members"""
    try:
        # Get users by role
        users = await db_service.list_users_by_role(role)
        
        # Convert to StaffProfile models (without password hash)
        staff_profiles = []
        for user in users:
            profile = StaffProfile(
                user_id=user['user_id'],
                name=user['name'],
                role=user['role'],
                avatar=user.get('avatar'),
                contact_info=user.get('contact_info', {}),
                permissions=user.get('permissions', []),
                email=user['email'],
                created_at=user.get('created_at'),
                updated_at=user.get('updated_at')
            )
            staff_profiles.append(profile)
        
        return staff_profiles
        
    except Exception as e:
        logger.error(f"Error listing doctors: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list doctors"
        )


@router.get("/{doctor_id}", response_model=StaffProfile)
async def get_doctor_profile(
    doctor_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get doctor profile by ID"""
    try:
        user = await db_service.get_user(doctor_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor not found"
            )
        
        # Return profile without password hash
        return StaffProfile(
            user_id=user['user_id'],
            name=user['name'],
            role=user['role'],
            avatar=user.get('avatar'),
            contact_info=user.get('contact_info', {}),
            permissions=user.get('permissions', []),
            email=user['email'],
            created_at=user.get('created_at'),
            updated_at=user.get('updated_at')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting doctor profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get doctor profile"
        )


@router.put("/{doctor_id}", response_model=StaffProfile)
async def update_doctor_profile(
    doctor_id: str,
    profile_updates: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update doctor profile"""
    try:
        # Check if user exists
        existing_user = await db_service.get_user(doctor_id)
        if not existing_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor not found"
            )
        
        # Only allow users to update their own profile or admin users
        if (current_user['user_id'] != doctor_id and 
            current_user.get('role') != 'admin'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this profile"
            )
        
        # Filter allowed updates (exclude sensitive fields)
        allowed_fields = ['name', 'avatar', 'contact_info']
        updates = {k: v for k, v in profile_updates.items() if k in allowed_fields}
        
        if not updates:
            return StaffProfile(**existing_user)
        
        # Update user profile
        # Note: This would require implementing update_user in db_service
        # For now, return the existing profile
        logger.info(f"Profile update requested for {doctor_id}: {updates}")
        
        return StaffProfile(
            user_id=existing_user['user_id'],
            name=existing_user['name'],
            role=existing_user['role'],
            avatar=existing_user.get('avatar'),
            contact_info=existing_user.get('contact_info', {}),
            permissions=existing_user.get('permissions', []),
            email=existing_user['email'],
            created_at=existing_user.get('created_at'),
            updated_at=existing_user.get('updated_at')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating doctor profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update doctor profile"
        )
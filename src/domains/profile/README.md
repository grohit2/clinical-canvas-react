# Profile Domain

## Purpose
User profile management including personal info, professional details,
notifications, account settings, and security configuration.

## Screens
| Screen | Route | Description |
|--------|-------|-------------|
| ProfileScreen | `/(app)/profile` | User profile with stats, info, and settings |

## Profile Sections
| Section | Description |
|---------|-------------|
| Profile Header | Avatar, name, role, QR scanner |
| Quick Stats | Patients today, tasks completed, hours worked |
| Profile Information | Email, shift details |
| Settings Menu | Account settings, notifications, security |

## Account Settings Subsections
| Section | Fields |
|---------|--------|
| Personal Information | Full name, gender, email, DOB |
| Professional Information | Specialization, department, experience, registration, fees |
| Security Settings | Password, 2FA, last login |

## Core Logic (Pure TypeScript)
| File | Purpose |
|------|---------|
| `types.ts` | UserProfile, UserStats, Preferences types |
| `types.ts` | getPriorityColorClass helper |

## Notification Priorities
| Priority | Color |
|----------|-------|
| Urgent | Red |
| High | Orange |
| Medium | Yellow |
| Low | Green |

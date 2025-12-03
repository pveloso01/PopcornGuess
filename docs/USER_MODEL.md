# Custom User Model

## Overview

PopcornGuess uses a custom Django user model designed for gaming platforms. The model uses **email for authentication** and **username as a display name/gamertag**.

## Design Decisions

### Why Custom User Model?

Django strongly recommends setting up a custom user model **before the first migration**, even if the default model seems sufficient. This decision:

- Allows future flexibility without complex migrations
- Prevents breaking foreign key relationships
- Enables gaming-specific features (stats, streaks, etc.)

### Authentication vs Display

**Email (Authentication):**
- Primary identifier (`USERNAME_FIELD`)
- Used for login
- Private and secure
- Must be unique

**Username (Display):**
- Public-facing gamertag
- Shown on leaderboards, profiles, etc.
- Must be unique
- 150 characters max

## Model Structure

```python
class User(AbstractUser):
    email = models.EmailField(unique=True)  # For authentication
    username = models.CharField(max_length=150, unique=True)  # For display
    
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]
```

## API Usage

### Registration

```json
POST /api/v1/users/
{
  "email": "player@example.com",
  "username": "ProGamer123",
  "password": "securepass123",
  "password_confirm": "securepass123"
}
```

### Login

Users log in with their **email** (not username):
```json
{
  "email": "player@example.com",
  "password": "securepass123"
}
```

### Display

The **username** is used for:
- Leaderboards
- User profiles
- In-game display
- Social features

## Future Extensions

The model is ready for gaming-specific fields:
- Avatar/profile picture
- Stats and achievements
- Daily streak tracking
- Friend lists
- Game preferences

## Creating Users

**Via Django Admin:**
```bash
python manage.py createsuperuser
# Will prompt for: email, username, password
```

**Via API:**
```bash
POST /api/v1/users/
```

**Programmatically:**
```python
from django.contrib.auth import get_user_model

User = get_user_model()

# Regular user
user = User.objects.create_user(
    email="player@example.com",
    username="ProGamer",
    password="securepass123"
)

# Superuser
admin = User.objects.create_superuser(
    email="admin@example.com",
    username="admin",
    password="adminpass123"
)
```

## Validation

Both `email` and `username` must be:
- Unique across all users
- Non-empty
- Valid format (email for email field)

Username allows: letters, digits, and `@/./+/-/_` characters.

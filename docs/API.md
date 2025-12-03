# API Documentation

## Base URL

```
http://localhost:8000/api/v1/
```

## Versioning

The API uses URL path versioning (e.g., `/api/v1/`, `/api/v2/`). This approach:
- Maintains backward compatibility
- Allows multiple API versions to coexist
- Provides clear migration paths for clients

## Authentication

Currently using session authentication. JWT or token authentication will be added in future iterations.

## User Endpoints

### Register User

```http
POST /api/v1/users/
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "gamertag123",
  "password": "securepass123",
  "password_confirm": "securepass123",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "gamertag123",
  "first_name": "John",
  "last_name": "Doe",
  "is_active": true,
  "date_joined": "2025-12-03T10:00:00Z",
  "last_login": null
}
```

### Get Current User

```http
GET /api/v1/users/me/
Authorization: Session
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "gamertag123",
  "first_name": "John",
  "last_name": "Doe",
  "is_active": true,
  "date_joined": "2025-12-03T10:00:00Z",
  "last_login": "2025-12-03T10:30:00Z"
}
```

### Update Profile

```http
PATCH /api/v1/users/update_profile/
Authorization: Session
Content-Type: application/json

{
  "username": "newgamertag",
  "first_name": "Jane"
}
```

**Response:** `200 OK`

### Change Password

```http
POST /api/v1/users/change_password/
Authorization: Session
Content-Type: application/json

{
  "old_password": "oldpass123",
  "new_password": "newpass123",
  "new_password_confirm": "newpass123"
}
```

**Response:** `200 OK`
```json
{
  "detail": "Password changed successfully."
}
```

## Error Responses

### Validation Error

```json
{
  "field_name": ["Error message"]
}
```

### Authentication Error

```json
{
  "detail": "Authentication credentials were not provided."
}
```

## Future Endpoints

Planned endpoints for future development:
- Quiz endpoints (`/api/v1/quizzes/`)
- Analytics endpoints (`/api/v1/analytics/`)
- Leaderboard endpoints (`/api/v1/leaderboards/`)

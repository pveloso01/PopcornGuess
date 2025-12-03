"""
API views for user management.
This is a skeleton implementation - specific endpoints and permissions
will be implemented as needed during development.
"""

from django.contrib.auth import get_user_model

from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .serializers import (
    PasswordChangeSerializer,
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
)

User = get_user_model()


@extend_schema_view(
    list=extend_schema(
        summary="List all users",
        description="Retrieve a paginated list of all registered users. Requires authentication.",
        tags=["users"],
    ),
    retrieve=extend_schema(
        summary="Get user details",
        description="Retrieve detailed information about a specific user by ID.",
        tags=["users"],
    ),
    create=extend_schema(
        summary="Register new user",
        description=(
            "Create a new user account. This endpoint is publicly "
            "accessible. Email for authentication, username for display."
        ),
        tags=["users"],
        responses={
            201: UserSerializer,
            400: OpenApiResponse(description="Validation error"),
        },
    ),
    update=extend_schema(
        summary="Update user (full)",
        description="Update all fields of a user. Requires authentication.",
        tags=["users"],
    ),
    partial_update=extend_schema(
        summary="Update user (partial)",
        description="Update specific fields of a user. Requires authentication.",
        tags=["users"],
    ),
    destroy=extend_schema(
        summary="Delete user",
        description="Permanently delete a user account. Requires authentication.",
        tags=["users"],
    ),
)
class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user CRUD operations including registration,
    profile management, and authentication.

    Authentication:
    - Email-based login (USERNAME_FIELD = email)
    - Username used for display/gamertag purposes
    """

    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_serializer_class(self):  # type: ignore[no-untyped-def,override]
        """Return appropriate serializer class based on action."""
        if self.action == "create":
            return UserCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):  # type: ignore[no-untyped-def,override]
        """Return appropriate permissions based on action.

        Registration (create) is allowed for anyone.
        """
        if self.action == "create":
            return [AllowAny()]
        return [IsAuthenticated()]

    @extend_schema(
        summary="Get current user profile",
        description=(
            "Retrieve the authenticated user's profile information. "
            "This endpoint returns the currently logged-in user's data."
        ),
        tags=["users"],
        responses={
            200: UserSerializer,
            401: OpenApiResponse(description="Not authenticated"),
        },
    )
    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def me(self, request):  # type: ignore[no-untyped-def]
        """Get current user's profile."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @extend_schema(
        summary="Update current user profile",
        description=(
            "Update the authenticated user's profile information. "
            "Allows partial updates (PATCH) to username, first_name, and "
            "last_name."
        ),
        tags=["users"],
        request=UserUpdateSerializer,
        responses={
            200: UserUpdateSerializer,
            400: OpenApiResponse(description="Validation error"),
            401: OpenApiResponse(description="Not authenticated"),
        },
    )
    @action(detail=False, methods=["patch"], permission_classes=[IsAuthenticated])
    def update_profile(self, request):  # type: ignore[no-untyped-def]
        """Update current user's profile."""
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @extend_schema(
        summary="Change password",
        description=(
            "Change the authenticated user's password. "
            "Requires the old password for verification and new password "
            "confirmation."
        ),
        tags=["users"],
        request=PasswordChangeSerializer,
        responses={
            200: OpenApiResponse(
                description="Password changed successfully",
                response={
                    "type": "object",
                    "properties": {"detail": {"type": "string"}},
                },
            ),
            400: OpenApiResponse(
                description="Validation error or incorrect old password"
            ),
            401: OpenApiResponse(description="Not authenticated"),
        },
    )
    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def change_password(self, request):  # type: ignore[no-untyped-def]
        """Change current user's password."""
        serializer = PasswordChangeSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        # Change password
        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save()

        return Response(
            {"detail": "Password changed successfully."}, status=status.HTTP_200_OK
        )

"""
API views for user management.
This is a skeleton implementation - specific endpoints and permissions
will be implemented as needed during development.
"""

from django.contrib.auth import get_user_model
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


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user CRUD operations.
    This is a basic skeleton - authentication, permissions,
    and specific endpoints will be configured as needed.
    """

    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_serializer_class(self):  # type: ignore[no-untyped-def,override]
        """
        Return appropriate serializer class based on action.
        """
        if self.action == "create":
            return UserCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):  # type: ignore[no-untyped-def,override]
        """
        Return appropriate permissions based on action.
        Registration (create) is allowed for anyone.
        """
        if self.action == "create":
            return [AllowAny()]
        return [IsAuthenticated()]

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def me(self, request):  # type: ignore[no-untyped-def]
        """
        Get current user's profile.
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=["patch"], permission_classes=[IsAuthenticated])
    def update_profile(self, request):  # type: ignore[no-untyped-def]
        """
        Update current user's profile.
        """
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def change_password(self, request):  # type: ignore[no-untyped-def]
        """
        Change current user's password.
        """
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

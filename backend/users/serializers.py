"""
Serializers for the User model.
"""

from typing import Any

from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """
    User serializer for API responses.

    Returns user profile information including:
    - Email (used for authentication)
    - Username (display name/gamertag)
    - Profile information (first_name, last_name)
    - Account status and timestamps
    """

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "is_active",
            "date_joined",
            "last_login",
        ]
        read_only_fields = ["id", "date_joined", "last_login"]
        extra_kwargs = {
            "email": {
                "help_text": "User's email address (used for authentication)",
            },
            "username": {
                "help_text": "Unique username/gamertag for display purposes",
            },
            "is_active": {
                "help_text": "Indicates if the user account is active",
            },
        }


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration.

    Handles new user account creation with:
    - Email (required, unique, used for login)
    - Username (required, unique, display name/gamertag)
    - Password with confirmation (min 8 characters)
    - Optional profile information
    """

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        help_text="Password (minimum 8 characters)",
        style={"input_type": "password"},
    )
    password_confirm = serializers.CharField(
        write_only=True,
        help_text="Password confirmation (must match password)",
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = [
            "email",
            "username",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
        ]

    def validate(self, attrs):  # type: ignore[no-untyped-def,override]
        """
        Validate that passwords match.
        """
        if attrs.get("password") != attrs.get("password_confirm"):
            raise serializers.ValidationError(
                {"password": "Password fields didn't match."}
            )
        return attrs

    def create(self, validated_data):  # type: ignore[no-untyped-def,override]
        """
        Create a new user with encrypted password.
        """
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile information.

    Allows updating:
    - Username (display name/gamertag)
    - First and last name

    Note: Use the separate change_password endpoint to update password.
    """

    class Meta:
        model = User
        fields = [
            "username",
            "first_name",
            "last_name",
        ]
        extra_kwargs = {
            "username": {
                "help_text": "New username/gamertag (must be unique)",
            },
        }


class PasswordChangeSerializer(serializers.Serializer):
    """
    Serializer for password change endpoint.

    Requires:
    - Old password for verification
    - New password (minimum 8 characters)
    - New password confirmation (must match)
    """

    old_password = serializers.CharField(
        required=True,
        write_only=True,
        help_text="Current password for verification",
        style={"input_type": "password"},
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        min_length=8,
        help_text="New password (minimum 8 characters)",
        style={"input_type": "password"},
    )
    new_password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        help_text="New password confirmation (must match new_password)",
        style={"input_type": "password"},
    )

    def validate(self, attrs):  # type: ignore[no-untyped-def,override]
        """
        Validate that new passwords match.
        """
        if attrs.get("new_password") != attrs.get("new_password_confirm"):
            raise serializers.ValidationError(
                {"new_password": "Password fields didn't match."}
            )
        return attrs

    def validate_old_password(self, value: str) -> str:
        """
        Validate that the old password is correct.
        """
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

"""
Serializers for the User model.
"""

from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """
    Basic User serializer for API responses.
    This is a skeleton serializer - additional fields and validation
    will be added as needed during development.
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


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration/creation.
    Includes password handling and validation.
    """

    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

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
    Serializer for updating user information.
    Excludes sensitive fields like password (use separate endpoint for that).
    """

    class Meta:
        model = User
        fields = [
            "username",
            "first_name",
            "last_name",
        ]


class PasswordChangeSerializer(serializers.Serializer):
    """
    Serializer for password change endpoint.
    """

    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(required=True, write_only=True)

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

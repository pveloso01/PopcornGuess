"""Tests for users app."""

from django.contrib.auth import get_user_model
from django.test import TestCase

User = get_user_model()


class UserModelTestCase(TestCase):
    """Test cases for custom User model."""

    def test_create_user(self):
        """Test creating a regular user with email and username."""
        email = "test@example.com"
        username = "testuser"
        password = "testpass123"
        user = User.objects.create_user(
            email=email, username=username, password=password
        )

        self.assertEqual(user.email, email)
        self.assertEqual(user.username, username)
        self.assertTrue(user.check_password(password))
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_create_user_without_email(self):
        """Test that creating a user without email raises ValueError."""
        with self.assertRaises(ValueError):
            User.objects.create_user(email="", password="testpass123")

    def test_create_superuser(self):
        """Test creating a superuser."""
        email = "admin@example.com"
        username = "admin"
        password = "adminpass123"
        user = User.objects.create_superuser(
            email=email, username=username, password=password
        )

        self.assertEqual(user.email, email)
        self.assertEqual(user.username, username)
        self.assertTrue(user.check_password(password))
        self.assertTrue(user.is_active)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)

    def test_user_string_representation(self):
        """Test the string representation of user."""
        email = "test@example.com"
        username = "testuser"
        user = User.objects.create_user(
            email=email, username=username, password="testpass123"
        )
        self.assertEqual(str(user), f"{username} ({email})")

    def test_get_full_name(self):
        """Test get_full_name method."""
        user = User.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            first_name="John",
            last_name="Doe",
        )
        self.assertEqual(user.get_full_name(), "John Doe")

    def test_get_full_name_fallback(self):
        """Test get_full_name returns email when names not set."""
        email = "test@example.com"
        username = "testuser"
        user = User.objects.create_user(
            email=email, username=username, password="testpass123"
        )
        self.assertEqual(user.get_full_name(), email)

    def test_get_short_name(self):
        """Test get_short_name returns username."""
        username = "gamertag123"
        user = User.objects.create_user(
            email="test@example.com", username=username, password="testpass123"
        )
        self.assertEqual(user.get_short_name(), username)

    def test_email_normalization(self):
        """Test that email is normalized on user creation."""
        email = "test@EXAMPLE.COM"
        username = "testuser"
        user = User.objects.create_user(
            email=email, username=username, password="testpass123"
        )
        self.assertEqual(user.email, "test@example.com")

    def test_username_unique(self):
        """Test that username must be unique."""
        User.objects.create_user(
            email="test1@example.com", username="testuser", password="testpass123"
        )
        with self.assertRaises(Exception):  # IntegrityError
            User.objects.create_user(
                email="test2@example.com", username="testuser", password="testpass123"
            )


class UserManagerTestCase(TestCase):
    """Test cases for custom UserManager."""

    def test_create_superuser_with_is_staff_false(self):
        """Test that creating superuser with is_staff=False raises error."""
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email="admin@example.com",
                username="admin",
                password="adminpass123",
                is_staff=False,
            )

    def test_create_superuser_with_is_superuser_false(self):
        """Test that creating superuser with is_superuser=False raises error."""
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email="admin@example.com",
                username="admin",
                password="adminpass123",
                is_superuser=False,
            )

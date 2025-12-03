"""Tests for users app."""

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

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


class UserSerializerTestCase(TestCase):
    """Test cases for User serializers."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
            first_name="Test",
            last_name="User",
        )

    def test_user_serializer(self):
        """Test UserSerializer."""
        from users.serializers import UserSerializer

        serializer = UserSerializer(instance=self.user)
        data = serializer.data

        self.assertEqual(data["email"], "test@example.com")
        self.assertEqual(data["username"], "testuser")
        self.assertEqual(data["first_name"], "Test")
        self.assertEqual(data["last_name"], "User")
        self.assertIn("id", data)
        self.assertIn("date_joined", data)

    def test_user_create_serializer_valid(self):
        """Test UserCreateSerializer with valid data."""
        from users.serializers import UserCreateSerializer

        data = {
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "newpass123",
            "password_confirm": "newpass123",
            "first_name": "New",
            "last_name": "User",
        }
        serializer = UserCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid())

        user = serializer.save()
        self.assertEqual(user.email, "newuser@example.com")
        self.assertEqual(user.username, "newuser")
        self.assertTrue(user.check_password("newpass123"))

    def test_user_create_serializer_password_mismatch(self):
        """Test UserCreateSerializer with mismatched passwords."""
        from users.serializers import UserCreateSerializer

        data = {
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "newpass123",
            "password_confirm": "differentpass",
        }
        serializer = UserCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("password", serializer.errors)

    def test_user_update_serializer(self):
        """Test UserUpdateSerializer."""
        from users.serializers import UserUpdateSerializer

        data = {"username": "updateduser", "first_name": "Updated"}
        serializer = UserUpdateSerializer(instance=self.user, data=data, partial=True)
        self.assertTrue(serializer.is_valid())

        user = serializer.save()
        self.assertEqual(user.username, "updateduser")
        self.assertEqual(user.first_name, "Updated")

    def test_password_change_serializer_valid(self):
        """Test PasswordChangeSerializer with valid data."""
        from users.serializers import PasswordChangeSerializer

        data = {
            "old_password": "testpass123",
            "new_password": "newpass456",
            "new_password_confirm": "newpass456",
        }

        # Create a mock request with user
        class MockRequest:
            user = None

        request = MockRequest()
        request.user = self.user

        serializer = PasswordChangeSerializer(data=data, context={"request": request})
        self.assertTrue(serializer.is_valid())

    def test_password_change_serializer_wrong_old_password(self):
        """Test PasswordChangeSerializer with wrong old password."""
        from users.serializers import PasswordChangeSerializer

        data = {
            "old_password": "wrongpass",
            "new_password": "newpass456",
            "new_password_confirm": "newpass456",
        }

        class MockRequest:
            user = None

        request = MockRequest()
        request.user = self.user

        serializer = PasswordChangeSerializer(data=data, context={"request": request})
        self.assertFalse(serializer.is_valid())
        self.assertIn("old_password", serializer.errors)

    def test_password_change_serializer_mismatch(self):
        """Test PasswordChangeSerializer with mismatched new passwords."""
        from users.serializers import PasswordChangeSerializer

        data = {
            "old_password": "testpass123",
            "new_password": "newpass456",
            "new_password_confirm": "differentpass",
        }

        class MockRequest:
            user = None

        request = MockRequest()
        request.user = self.user

        serializer = PasswordChangeSerializer(data=data, context={"request": request})
        self.assertFalse(serializer.is_valid())
        self.assertIn("new_password", serializer.errors)


class UserAPITestCase(APITestCase):
    """Test cases for User API endpoints."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="testpass123",
        )
        self.list_url = reverse("users:user-list")

    def test_user_registration(self):
        """Test user registration endpoint."""
        data = {
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "newpass123",
            "password_confirm": "newpass123",
        }
        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 2)

    def test_user_me_authenticated(self):
        """Test /me endpoint for authenticated user."""
        self.client.force_authenticate(user=self.user)
        url = reverse("users:user-me")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "test@example.com")

    def test_user_me_unauthenticated(self):
        """Test /me endpoint for unauthenticated user."""
        url = reverse("users:user-me")
        response = self.client.get(url)
        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )

    def test_update_profile(self):
        """Test profile update endpoint."""
        self.client.force_authenticate(user=self.user)
        url = reverse("users:user-update-profile")
        data = {"username": "updateduser", "first_name": "Updated"}
        response = self.client.patch(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "updateduser")

    def test_change_password(self):
        """Test password change endpoint."""
        self.client.force_authenticate(user=self.user)
        url = reverse("users:user-change-password")
        data = {
            "old_password": "testpass123",
            "new_password": "newpass456",
            "new_password_confirm": "newpass456",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("newpass456"))

    def test_list_users_requires_auth(self):
        """Test that listing users requires authentication."""
        response = self.client.get(self.list_url)
        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )

    def test_partial_update_user(self):
        """Test partial update (PATCH) on user detail endpoint."""
        self.client.force_authenticate(user=self.user)
        url = reverse("users:user-detail", kwargs={"pk": self.user.pk})
        data = {"first_name": "PartialUpdate"}
        response = self.client.patch(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "PartialUpdate")

"""Fernet encryption for OAuth tokens and sensitive data.

Derives a 256-bit key from the user's master password via PBKDF2
(100 000 iterations, random salt).  The salt and a key-check value
are stored in the crypto_meta table so the password can be validated
without storing it.
"""

from __future__ import annotations

import os
import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes


_KEY_CHECK_PLAINTEXT = b"PBSP_KEY_CHECK_VALUE"
_PBKDF2_ITERATIONS = 100_000


def _derive_key(password: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=_PBKDF2_ITERATIONS,
    )
    return base64.urlsafe_b64encode(kdf.derive(password.encode("utf-8")))


class EncryptionManager:
    """Manages Fernet encryption with a master-password-derived key."""

    def __init__(self) -> None:
        self._fernet: Fernet | None = None

    @property
    def is_initialized(self) -> bool:
        return self._fernet is not None

    def setup(self, password: str) -> tuple[bytes, bytes]:
        """First-time setup: generate salt and key-check.

        Returns (salt, encrypted_key_check) to be stored in crypto_meta.
        """
        salt = os.urandom(32)
        key = _derive_key(password, salt)
        self._fernet = Fernet(key)
        key_check = self._fernet.encrypt(_KEY_CHECK_PLAINTEXT)
        return salt, key_check

    def unlock(self, password: str, salt: bytes, key_check: bytes) -> bool:
        """Validate password against stored salt/key-check.

        Returns True if password is correct and sets internal Fernet key.
        """
        key = _derive_key(password, salt)
        fernet = Fernet(key)
        try:
            decrypted = fernet.decrypt(key_check)
            if decrypted == _KEY_CHECK_PLAINTEXT:
                self._fernet = fernet
                return True
        except InvalidToken:
            pass
        return False

    def encrypt(self, plaintext: str | bytes) -> bytes:
        if self._fernet is None:
            raise RuntimeError("Encryption not initialized — call setup() or unlock() first")
        if isinstance(plaintext, str):
            plaintext = plaintext.encode("utf-8")
        return self._fernet.encrypt(plaintext)

    def decrypt(self, ciphertext: bytes) -> bytes:
        if self._fernet is None:
            raise RuntimeError("Encryption not initialized — call setup() or unlock() first")
        return self._fernet.decrypt(ciphertext)

    def decrypt_str(self, ciphertext: bytes) -> str:
        return self.decrypt(ciphertext).decode("utf-8")

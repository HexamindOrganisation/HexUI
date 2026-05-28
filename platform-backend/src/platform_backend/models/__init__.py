"""Importing this package registers every model on `Base.metadata`.

Alembic's `env.py` does `from platform_backend import models` for exactly this
side effect, so autogenerate sees every table.
"""

from .user import User  # noqa: F401

__all__ = ["User"]

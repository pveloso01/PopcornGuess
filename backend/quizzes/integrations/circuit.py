"""
Simple in-memory circuit breaker for outbound integrations.

Each named circuit tracks consecutive failures. After `threshold`
consecutive failures the circuit opens — subsequent calls raise
`CircuitOpenError` immediately for `cooldown_seconds`. After cooldown
the next call is "half-open": one attempt is allowed. Success resets,
failure re-opens.

Module-level state — fine for the single-process Fly machine that runs
the nightly cron. Not safe across processes.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Callable, TypeVar

T = TypeVar("T")


class CircuitOpenError(RuntimeError):
    """Raised when a circuit is currently open."""


@dataclass
class CircuitState:
    failures: int = 0
    opened_at: float | None = None


_state: dict[str, CircuitState] = {}


def _get(name: str) -> CircuitState:
    state = _state.get(name)
    if state is None:
        state = CircuitState()
        _state[name] = state
    return state


def reset(name: str | None = None) -> None:
    """Reset a single named circuit, or all circuits when `name` is None."""
    if name is None:
        _state.clear()
        return
    _state.pop(name, None)


def call(
    name: str,
    fn: Callable[..., T],
    *args: Any,
    threshold: int = 5,
    cooldown_seconds: int = 600,
    **kwargs: Any,
) -> T:
    """
    Invoke `fn(*args, **kwargs)` guarded by the named circuit.

    Raises CircuitOpenError if the circuit is open. Re-raises the
    underlying exception from `fn` after recording the failure.
    """
    state = _get(name)
    now = time.monotonic()

    if state.opened_at is not None:
        elapsed = now - state.opened_at
        if elapsed < cooldown_seconds:
            raise CircuitOpenError(
                f"Circuit {name!r} open for another "
                f"{cooldown_seconds - elapsed:.0f}s"
            )
        # half-open: allow one trial call. Leave opened_at set; success
        # below will clear it.

    try:
        result = fn(*args, **kwargs)
    except Exception:
        state.failures += 1
        if state.failures >= threshold:
            state.opened_at = time.monotonic()
        raise

    state.failures = 0
    state.opened_at = None
    return result


__all__ = ["CircuitOpenError", "CircuitState", "call", "reset"]

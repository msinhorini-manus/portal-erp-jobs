"""Small process-local rate limiter for authentication endpoints.

This deliberately matches the current Gunicorn topology of one worker. It must
be replaced by shared Redis-backed state before adding workers or replicas.
"""
from __future__ import annotations

import hashlib
import threading
import time
from collections import deque


class InMemoryRateLimiter:
    MAX_KEYS = 10_000

    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = {}
        self._lock = threading.Lock()
        self._checks = 0

    @staticmethod
    def _key(scope: str, ip_address: str, email: str) -> str:
        normalized = (email or "").strip().casefold()
        digest = hashlib.sha256(f"{ip_address}|{normalized}".encode("utf-8")).hexdigest()
        return f"{scope}:{digest}"

    def check(
        self,
        *,
        scope: str,
        ip_address: str,
        email: str,
        limit: int,
        window_seconds: int,
    ) -> tuple[bool, int]:
        now = time.monotonic()
        cutoff = now - window_seconds
        key = self._key(scope, ip_address, email)
        with self._lock:
            self._checks += 1
            if self._checks % 1_000 == 0:
                stale = [
                    event_key
                    for event_key, values in self._events.items()
                    if not values or values[-1] <= cutoff
                ]
                for event_key in stale:
                    self._events.pop(event_key, None)
            if key not in self._events and len(self._events) >= self.MAX_KEYS:
                self._events.pop(next(iter(self._events)))
            events = self._events.setdefault(key, deque())
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= limit:
                retry_after = max(1, int(window_seconds - (now - events[0])))
                return False, retry_after
            events.append(now)
            return True, 0

    def clear(self) -> None:
        """Clear process-local state (also useful for isolated tests)."""
        with self._lock:
            self._events.clear()
            self._checks = 0


auth_rate_limiter = InMemoryRateLimiter()

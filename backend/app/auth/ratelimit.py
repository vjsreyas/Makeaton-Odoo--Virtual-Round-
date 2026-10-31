import threading
import time
from collections import deque

from app.core.config import get_settings
from app.core.errors import AppError

_PRUNE_THRESHOLD = 10_000


class SlidingWindowLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def check(self, key: str, limit: int, window_seconds: int) -> None:
        if not get_settings().rate_limit_enabled:
            return
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            if len(self._hits) > _PRUNE_THRESHOLD:
                self._prune(cutoff)
            hits = self._hits.setdefault(key, deque())
            while hits and hits[0] <= cutoff:
                hits.popleft()
            if len(hits) >= limit:
                retry_after = max(1, int(hits[0] + window_seconds - now) + 1)
                raise AppError(
                    "RATE_LIMITED",
                    "Too many requests, try again later",
                    status_code=429,
                    headers={"Retry-After": str(retry_after)},
                )
            hits.append(now)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()

    def _prune(self, cutoff: float) -> None:
        stale = [key for key, hits in self._hits.items() if not hits or hits[-1] <= cutoff]
        for key in stale:
            del self._hits[key]


limiter = SlidingWindowLimiter()

LOGIN_LIMIT = (5, 60)
RESET_REQUEST_LIMIT = (3, 3600)
REGISTER_LIMIT = (3, 3600)
REGISTER_IP_LIMIT = (20, 3600)

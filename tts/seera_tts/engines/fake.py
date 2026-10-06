"""A GPU-free stand-in for XTTS, for developing the server, clients and frontend.

It "speaks" a soft tone whose length follows the text length, streamed in small
chunks at roughly real-time speed - so timing, streaming and highlighting behave
like the real thing. Select it with SEERA_TTS_ENGINE=fake.
"""

from __future__ import annotations

import time
from collections.abc import Iterator

import numpy as np

from ..config import TTSConfig
from .base import TTSEngine

_SECONDS_PER_CHAR = 0.06  # about the pace of calm Arabic narration
_CHUNK_SECONDS = 0.25


class FakeEngine(TTSEngine):
    def __init__(self, config: TTSConfig, realtime: bool | None = None):
        self.sample_rate = config.sample_rate
        self._voice = config.default_voice
        self._realtime = config.fake_realtime if realtime is None else realtime

    def load(self) -> None:
        pass

    def voices(self) -> list[str]:
        return [self._voice]

    def stream(self, text: str, voice: str) -> Iterator[np.ndarray]:
        if voice not in self.voices():
            raise KeyError(f"Unknown voice {voice!r}. Available: {self.voices()}")
        total = int(len(text) * _SECONDS_PER_CHAR * self.sample_rate)
        step = int(_CHUNK_SECONDS * self.sample_rate)
        for start in range(0, total, step):
            n = min(step, total - start)
            t = (start + np.arange(n)) / self.sample_rate
            yield (0.1 * np.sin(2 * np.pi * 220 * t)).astype(np.float32)
            if self._realtime:
                time.sleep(n / self.sample_rate * 0.8)  # like XTTS at RTF 0.8
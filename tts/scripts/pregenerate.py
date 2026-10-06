"""Pre-generate the narration audio for every event, so the app needs no GPU at runtime.

For each event it writes two files into data/audio/:
    <event_id>.mp3    the narration (title + text), mono MP3
    <event_id>.json   a timeline: when each sentence is heard, and where Quran verses go

Run it once on a GPU (Kaggle), then ship data/audio/ with the project.

    python scripts/pregenerate.py --data ../data                    # everything
    python scripts/pregenerate.py --data ../data --chapters ch01 ch02
    python scripts/pregenerate.py --data ../data --shard 0/2        # GPU 0 of 2 (run 1/2 on the other)

It is resumable: events that already have both files are skipped, so a session that
times out just continues where it stopped when you run it again.
"""

from __future__ import annotations

import argparse
import json
import logging
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # make seera_tts importable

from seera_tts.audio import pcm16_to_wav, silence, to_pcm16  # noqa: E402
from seera_tts.config import TTSConfig  # noqa: E402
from seera_tts.pipeline import AudioChunk, NarrationPipeline, QuranSegment, SegmentStarted  # noqa: E402

logger = logging.getLogger("pregenerate")

QURAN_GAP_SECONDS = 0.3  # silence after a verse marker, so the player can pause exactly there


def event_texts(data_dir: Path, chapters: list[str] | None) -> list[tuple[str, str]]:
    """(file_stem, text) for every event - the same text the listen button reads."""
    items = []
    for path in sorted((data_dir / "chapters").glob("ch*.json")):
        if chapters and path.stem not in chapters:
            continue
        chapter = json.loads(path.read_text("utf-8"))
        for section in chapter["sections"]:
            for ev in section["events"]:
                items.append((str(ev["id"]), f"{ev['title']}.\n{ev['details']}"))
                rewrite = data_dir / "rewrites" / f"{ev['id']}.json"  # optional story version
                if rewrite.exists():
                    story = json.loads(rewrite.read_text("utf-8")).get("story")
                    if story:
                        items.append((f"{ev['id']}.story", f"{ev['title']}.\n{story}"))
    return items


def render(pipeline: NarrationPipeline, text: str) -> tuple[bytes, dict]:
    """Narrate one text. Returns (pcm, timeline)."""
    sr = pipeline.sample_rate
    pcm = bytearray()
    items: list[dict] = []
    gap = to_pcm16(silence(int(QURAN_GAP_SECONDS * 1000), sr))
    now = lambda: round(len(pcm) / 2 / sr, 3)  # noqa: E731 - seconds of audio so far

    for event in pipeline.stream(text):
        if isinstance(event, AudioChunk):
            pcm += event.pcm
        elif isinstance(event, SegmentStarted):
            if items and items[-1]["kind"] == "speech":
                items[-1]["end"] = now()
            items.append({"kind": "speech", "start": now(), "end": None, "text": event.text})
        elif isinstance(event, QuranSegment):
            if items and items[-1]["kind"] == "speech":
                items[-1]["end"] = now()
            items.append({"kind": "quran", "at": now(), "text": event.text, "audio_urls": list(event.audio_urls)})
            pcm += gap
    if items and items[-1]["kind"] == "speech":
        items[-1]["end"] = now()
    return bytes(pcm), {"duration": now(), "sample_rate": sr, "items": items}


def to_mp3(wav: bytes, out: Path, bitrate: str) -> None:
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-i", "pipe:0", "-ac", "1", "-b:a", bitrate, str(out)],
        input=wav, check=True,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data", type=Path, required=True, help="the project's data/ folder")
    parser.add_argument("--out", type=Path, help="output folder (default: <data>/audio)")
    parser.add_argument("--chapters", nargs="*", help="only these chapters, e.g. ch01 ch02")
    parser.add_argument("--shard", default="0/1", help="i/n: process every n-th event starting at i")
    parser.add_argument("--bitrate", default="32k", help="MP3 bitrate (32k is clear for speech)")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s", datefmt="%H:%M:%S")

    out = args.out or args.data / "audio"
    out.mkdir(parents=True, exist_ok=True)
    shard, shards = (int(x) for x in args.shard.split("/"))
    todo = [
        (stem, text) for k, (stem, text) in enumerate(event_texts(args.data, args.chapters))
        if k % shards == shard and not ((out / f"{stem}.mp3").exists() and (out / f"{stem}.json").exists())
    ]
    logger.info("%d events to generate (shard %s)", len(todo), args.shard)
    if not todo:
        return

    pipeline = NarrationPipeline.from_config(TTSConfig.from_env())
    t0, audio_seconds = time.perf_counter(), 0.0
    for k, (stem, text) in enumerate(todo, 1):
        pcm, timeline = render(pipeline, text)
        to_mp3(pcm16_to_wav(pcm, pipeline.sample_rate), out / f"{stem}.mp3", args.bitrate)
        (out / f"{stem}.json").write_text(json.dumps(timeline, ensure_ascii=False), "utf-8")  # last = "done"
        audio_seconds += timeline["duration"]
        elapsed = time.perf_counter() - t0
        eta = elapsed / k * (len(todo) - k)
        logger.info("[%d/%d] %s  %.0fs audio | total %.1f min audio in %.1f min | ETA %.0f min",
                    k, len(todo), stem, timeline["duration"], audio_seconds / 60, elapsed / 60, eta / 60)


if __name__ == "__main__":
    main()

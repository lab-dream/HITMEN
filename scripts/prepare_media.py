#!/usr/bin/env python3
"""Create web-ready, Git-friendly copies of the HITMEN demonstration videos.

The source videos remain untouched. This script writes H.264/MP4 assets to
assets/videos, JPEG posters to assets/posters, a visual contact sheet, and a
machine-readable manifest. Short demonstrations are muted; the full overview
retains its original audio. Pass an ffmpeg binary with --ffmpeg
(imageio-ffmpeg is a convenient user-local provider).
"""
from __future__ import annotations

import argparse
import json
import math
import subprocess
from pathlib import Path

import cv2


ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    # A long-form, user-initiated research walkthrough. Its narrated AAC track is kept.
    "overview": "videos/HITMEN.mp4",
    "hero": "videos/HITMEN_Homepage_Main.mp4",
    "hand-confidence": "videos/handOcclusion.mp4",
    "hand-recovery": "videos/hand_Occlusion_sim.mp4",
    "torso-horizontal": "videos/waist_neck_horizon.mp4",
    "torso-vertical": "videos/waist_neck_vertical.mp4",
    "peg-in-hole": "videos/peginhole_sim.mp4",
    "out-of-range": "videos/out_of_range.mp4",
    "handover-vr": "Experiments_short/ball_hand_over/VR_ball_hand_over.mp4",
    "handover-leader": "Experiments_short/ball_hand_over/HMD_leader_ball_hand_over.mp4",
    "handover-hitmen": "Experiments_short/ball_hand_over/HITMEN_ball_hand_over.mp4",
    "extraction-vr": "Experiments_short/take_out_ball/VR_take_out_ball.mp4",
    "extraction-leader": "Experiments_short/take_out_ball/HMD_leader_take_out_ball.mp4",
    "extraction-hitmen": "Experiments_short/take_out_ball/HITMEN_take_out_ball.mp4",
    "racket-vr": "Experiments_short/racket_ball/VR_racket ball.mp4",
    "racket-leader": "Experiments_short/racket_ball/hmd_leader_racket ball.mp4",
    "racket-hitmen": "Experiments_short/racket_ball/HITMEN_racket ball.mp4",
    "bow-vr": "Experiments_short/toy_bow/VR_toy_bow.mp4",
    "bow-leader": "Experiments_short/toy_bow/HMD_leader_toy_bow.mp4",
    "bow-hitmen": "Experiments_short/toy_bow/HITMEN_toy_bow.mp4",
}


def probe(path: Path) -> dict:
    capture = cv2.VideoCapture(str(path))
    fps = capture.get(cv2.CAP_PROP_FPS)
    frames = capture.get(cv2.CAP_PROP_FRAME_COUNT)
    width = capture.get(cv2.CAP_PROP_FRAME_WIDTH)
    height = capture.get(cv2.CAP_PROP_FRAME_HEIGHT)
    capture.release()
    return {
        "duration_seconds": round(frames / fps, 2) if fps else 0,
        "size_bytes": path.stat().st_size,
        "width": int(width), "height": int(height), "fps": round(fps, 3),
    }


def still(source: Path, target: Path, timestamp: float) -> None:
    capture = cv2.VideoCapture(str(source))
    capture.set(cv2.CAP_PROP_POS_MSEC, timestamp * 1000)
    ok, frame = capture.read()
    if not ok:
        capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
        ok, frame = capture.read()
    capture.release()
    if not ok:
        raise RuntimeError(f"Could not read a poster frame from {source}")
    height, width = frame.shape[:2]
    max_width = 1280
    if width > max_width:
        frame = cv2.resize(frame, (max_width, round(height * max_width / width)))
    cv2.imwrite(str(target), frame, [cv2.IMWRITE_JPEG_QUALITY, 90])


def contact_sheet(posters: list[tuple[str, Path]], target: Path) -> None:
    cell_w, cell_h, gap, label_h = 360, 203, 18, 38
    columns = 3
    rows = math.ceil(len(posters) / columns)
    canvas = cv2.cvtColor(
        cv2.UMat(rows * (cell_h + label_h + gap) + gap,
                 columns * (cell_w + gap) + gap, cv2.CV_8UC1).get(),
        cv2.COLOR_GRAY2BGR,
    )
    canvas[:] = (11, 15, 25)
    for index, (name, poster) in enumerate(posters):
        frame = cv2.imread(str(poster))
        x = gap + (index % columns) * (cell_w + gap)
        y = gap + (index // columns) * (cell_h + label_h + gap)
        scaled = cv2.resize(frame, (cell_w, cell_h))
        canvas[y:y + cell_h, x:x + cell_w] = scaled
        cv2.putText(canvas, name, (x, y + cell_h + 26), cv2.FONT_HERSHEY_SIMPLEX,
                    0.64, (225, 236, 244), 1, cv2.LINE_AA)
    cv2.imwrite(str(target), canvas, [cv2.IMWRITE_JPEG_QUALITY, 92])


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ffmpeg", required=True)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()
    ffmpeg = args.ffmpeg
    video_dir, poster_dir = ROOT / "assets/videos", ROOT / "assets/posters"
    video_dir.mkdir(parents=True, exist_ok=True)
    poster_dir.mkdir(parents=True, exist_ok=True)
    manifest = {}
    posters = []
    for name, relative_source in SOURCES.items():
        source = ROOT / relative_source
        output = video_dir / f"{name}.mp4"
        poster = poster_dir / f"{name}.jpg"
        source_info = probe(source)
        # Keep dense UI overlays legible while yielding comfortably sub-100MB assets.
        is_hero = name == "hero"
        max_width = 1600 if is_hero else 1280
        crf, maxrate = (20, "12M") if is_hero else (21, "7M")
        vf = f"scale='min({max_width},iw)':-2:flags=lanczos"
        if args.overwrite or not output.exists():
            if name == "overview":
                # The source already is small H.264/AAC. Remux rather than re-encode so
                # the narrated explanatory film retains its original picture and sound.
                subprocess.run([
                    ffmpeg, "-y", "-i", str(source), "-map", "0", "-c", "copy",
                    "-movflags", "+faststart", str(output),
                ], check=True)
            else:
                subprocess.run([
                    ffmpeg, "-y", "-i", str(source), "-map", "0:v:0", "-an",
                    "-vf", vf, "-c:v", "libx264", "-preset", "medium", "-crf", str(crf),
                    "-maxrate", maxrate, "-bufsize", str(int(maxrate[:-1]) * 2) + "M",
                    "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output),
                ], check=True)
        if args.overwrite or not poster.exists():
            # A fifth into each clip is generally past slates and setup motion.
            poster_time = 65.0 if name == "overview" else source_info["duration_seconds"] * 0.20
            still(source, poster, max(0.0, poster_time))
        output_info = probe(output)
        manifest[name] = {
            "source": relative_source,
            "video": f"assets/videos/{output.name}",
            "poster": f"assets/posters/{poster.name}",
            "source_info": source_info,
            "output_info": output_info,
        }
        posters.append((name, poster))
        print(f"Prepared {name}: {output_info['width']}x{output_info['height']}, "
              f"{output_info['duration_seconds']}s, {output_info['size_bytes'] / 1e6:.1f} MB")
    contact_sheet(posters, ROOT / "assets/media-contact-sheet.jpg")
    (ROOT / "assets/media-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()

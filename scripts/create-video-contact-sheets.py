"""Create timestamped video contact sheets for human boundary review."""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path

from imageio_ffmpeg import get_ffmpeg_exe


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("video", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--start", type=float, default=0.0)
    parser.add_argument("--end", type=float, required=True)
    parser.add_argument("--fps", type=float, default=5.0)
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)
    output = args.output_dir / "sheet-%02d.jpg"
    font = "C\\:/Windows/Fonts/malgun.ttf"
    video_filter = (
        f"setpts=PTS+{args.start}/TB,"
        f"fps={args.fps},"
        "scale=320:-2,"
        f"drawtext=fontfile='{font}':"
        "text='%{pts\\:hms}':x=6:y=6:fontsize=20:fontcolor=yellow:"
        "box=1:boxcolor=black@0.65,"
        "tile=5x5:padding=3:margin=3"
    )
    command = [
        get_ffmpeg_exe(),
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        str(args.start),
        "-to",
        str(args.end),
        "-i",
        str(args.video),
        "-vf",
        video_filter,
        "-q:v",
        "2",
        "-fps_mode",
        "vfr",
        "-y",
        str(output),
    ]
    subprocess.run(command, check=True)
    print(f"Created contact sheets in {args.output_dir}")


if __name__ == "__main__":
    main()

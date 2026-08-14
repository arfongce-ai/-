"""Locate rule evidence in the official poomsae PDF sources.

Usage:
    python scripts/extract-pdf-evidence.py PDF [PDF ...] --terms 태극 정확성 Accuracy
"""

from __future__ import annotations

import argparse
from pathlib import Path

from pypdf import PdfReader


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdfs", nargs="+", type=Path)
    parser.add_argument("--terms", nargs="+", required=True)
    parser.add_argument("--excerpt", type=int, default=700)
    args = parser.parse_args()

    terms = tuple(term.casefold() for term in args.terms)
    for path in args.pdfs:
        reader = PdfReader(str(path))
        print(f"\nFILE\t{path.name}\tPAGES\t{len(reader.pages)}")
        for page_number, page in enumerate(reader.pages, start=1):
            text = " ".join((page.extract_text() or "").split())
            folded = text.casefold()
            matches = [term for term in terms if term in folded]
            if matches:
                print(
                    f"PAGE\t{page_number}\tMATCH\t{','.join(matches)}\t"
                    f"{text[: args.excerpt]}"
                )


if __name__ == "__main__":
    main()

#!/usr/bin/env bash
# Compile src/assets/files/resume.tex -> public/resume.pdf (source of truth: .tex only)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/src/assets/files"
OUT="$ROOT/public"
mkdir -p "$OUT"

# Override with e.g. registry.gitlab.com/islandoftex/images/texlive:latest for a newer TeX Live
TEXLIVE_IMAGE="${TEXLIVE_IMAGE:-blang/latex}"

run_xelatex_twice() {
  xelatex -interaction=nonstopmode resume.tex
  xelatex -interaction=nonstopmode resume.tex
}

if command -v xelatex >/dev/null 2>&1; then
  (cd "$SRC" && run_xelatex_twice)
elif command -v docker >/dev/null 2>&1; then
  echo "build-resume-pdf: using Docker (${TEXLIVE_IMAGE}) — xelatex not found locally" >&2
  docker run --rm -v "$ROOT:/work" -w /work/src/assets/files "$TEXLIVE_IMAGE" xelatex -interaction=nonstopmode resume.tex
  docker run --rm -v "$ROOT:/work" -w /work/src/assets/files "$TEXLIVE_IMAGE" xelatex -interaction=nonstopmode resume.tex
else
  echo "error: need xelatex or Docker. Install TeX Live (MacTeX / apt), or install Docker for the bundled TeX image." >&2
  echo "  apt: sudo apt-get install -y texlive-xetex texlive-fonts-recommended texlive-latex-extra texlive-fonts-extra" >&2
  exit 1
fi

cp "$SRC/resume.pdf" "$OUT/resume.pdf"
rm -f "$SRC/resume.aux" "$SRC/resume.log" "$SRC/resume.out" "$SRC/resume.pdf"

echo "Built $OUT/resume.pdf"

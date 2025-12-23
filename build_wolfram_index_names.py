#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from __future__ import annotations

import csv
from pathlib import Path
from typing import Dict

from sage.all import Graph  # type: ignore


# Update these if you change maxN / filenames
BASE_DIR = Path("~/code/projects/leaper").expanduser()
ALL_CSV = BASE_DIR / "wolfram_all_up_to_8.csv"
NAMED_CSV = BASE_DIR / "wolfram_named_up_to_8.csv"

OUT_PY = BASE_DIR / "src" / "leaper" / "graphsWolframIndex.py"


def canon_g6(g6: str) -> str:
    """Convert any graph6 labeling to Sage/nauty canonical graph6."""
    return Graph(g6).canonical_label().graph6_string()


def read_all_csv(path: Path) -> Dict[str, str]:
    """
    Build base mapping from Wolfram's (n,k) indexing:
      canonical_g6 -> f"{n}-graph {k}"
    """
    mapping: Dict[str, str] = {}
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        r = csv.DictReader(f)
        for row in r:
            n = int(row["n"])
            k = int(row["k"])
            g6 = row["Graph6"].strip()
            key = canon_g6(g6)
            mapping[key] = f"{n}-graph {k}"
    return mapping


def overlay_named_csv(mapping: Dict[str, str], path: Path) -> None:
    """
    Override base names when Wolfram provides a nicer GraphData name.
    """
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        r = csv.DictReader(f)
        for row in r:
            g6 = row["Graph6"].strip()
            nm = row["Name"].strip()
            if not g6 or not nm:
                continue
            key = canon_g6(g6)

            # Heuristic: only override if it’s not already an "n-graph k" style name
            # (You can relax this if you want.)
            if not nm.endswith("graph") and "graph " not in nm.lower():
                mapping[key] = nm
            else:
                # Still allow override if Wolfram name is *not* exactly the default style.
                # (Optional; comment out if you prefer never overriding with “8-graph 579” etc.)
                if nm.lower().strip() != mapping.get(key, "").lower().strip():
                    mapping[key] = nm


def write_module(mapping: Dict[str, str], out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    keys = sorted(mapping.keys())

    lines = []
    lines.append("# -*- coding: utf-8 -*-")
    lines.append('"""')
    lines.append("Auto-generated mapping:")
    lines.append("  Sage/nauty canonical graph6 -> preferred Wolfram-style name")
    lines.append('"""')
    lines.append("")
    lines.append("GRAPH6_TO_NAME = {")
    for k in keys:
        lines.append(f"    {k!r}: {mapping[k]!r},")
    lines.append("}")
    lines.append("")
    lines.append("def name_for_graph6(g6: str, default: str | None = None) -> str | None:")
    lines.append('    """Return preferred name for any graph6 string (any labeling)."""')
    lines.append("    from sage.all import Graph  # type: ignore")
    lines.append("    key = Graph(g6).canonical_label().graph6_string()")
    lines.append("    return GRAPH6_TO_NAME.get(key, default)")
    lines.append("")

    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {len(mapping)} entries to {out_path}")


def main() -> None:
    if not ALL_CSV.exists():
        raise FileNotFoundError(f"Missing {ALL_CSV} (download it from Wolfram Cloud export).")
    if not NAMED_CSV.exists():
        raise FileNotFoundError(f"Missing {NAMED_CSV} (download it from Wolfram Cloud export).")

    mapping = read_all_csv(ALL_CSV)
    overlay_named_csv(mapping, NAMED_CSV)
    write_module(mapping, OUT_PY)


if __name__ == "__main__":
    main()
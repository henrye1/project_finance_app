"""Extract the reference data the app needs from the Project Finance Scorecard workbook.

Usage:
    python -I tools/extract_reference_data.py "<workbook>.xlsm" src/data

Writes:
    referenceTables.json, sovereignRatings.json, glossary.json,
    pdScorecardStructure.json, recoveryUnderRestructure.json

The giant 'Project LGD New' sheet is never opened.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import openpyxl
from openpyxl.utils import column_index_from_string, get_column_letter

SKIP_SHEETS = {"Project LGD New"}


def load_sheet(path: str, name: str) -> dict[tuple[int, int], object]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True, keep_vba=False)
    ws = wb[name]
    cells: dict[tuple[int, int], object] = {}
    for row in ws.iter_rows():
        for c in row:
            if c.value is not None and c.value != "":
                cells[(c.row, c.column)] = c.value
    wb.close()
    return cells


def col(letter: str) -> int:
    return column_index_from_string(letter)


def get(cells, letter: str, row: int):
    return cells.get((row, col(letter)))


def normalise_id(value) -> str:
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    s = str(value).strip()
    s = re.sub(r"\s+", "", s)
    # LGD scorecard ids: 'H3.1', 'H2', 'H4' -> the questionnaire uses H4.1 for the insurance question
    if s == "H4":
        s = "H4.1"
    return s


def collapse_ws(s: str) -> str:
    return re.sub(r"\s+", " ", str(s)).strip()


SENIORITY_FIX = {"Mazanine": "Mezzanine"}


def extract_reference_tables(cells, lgd_scaling: float) -> dict:
    # Question/response/score blocks: B = id, C = question, D = response, E = description, F = score
    responses: dict[str, list[dict]] = {}
    current = None
    for row in range(3, 200):
        b = get(cells, "B", row)
        if b is not None:
            current = normalise_id(b)
            responses.setdefault(current, [])
        d = get(cells, "D", row)
        if current and d is not None:
            responses[current].append(
                {
                    "response": str(d).strip(),
                    "description": collapse_ws(get(cells, "E", row) or ""),
                    "score": float(get(cells, "F", row)),
                }
            )

    sectors = []
    for row in range(4, 10):
        name = get(cells, "O", row)
        if name:
            sectors.append({"name": collapse_ws(name), "volatility": float(get(cells, "P", row))})

    insolvency: dict[str, float] = {}
    for row in range(3, 400):
        name = get(cells, "R", row)
        if name:
            insolvency[collapse_ws(name)] = float(get(cells, "S", row))

    collateral_types = []
    for row in range(4, 40):
        t = get(cells, "Y", row)
        if t:
            collateral_types.append({"type": collapse_ws(t), "recoveryRate": float(get(cells, "Z", row))})

    score_bands = []
    for row in range(2, 6):
        score_bands.append({"min": float(get(cells, "AB", row)), "rating": str(get(cells, "AD", row))})

    risk_grades = []
    for row in range(3, 40):
        g = get(cells, "AF", row)
        if g:
            risk_grades.append(
                {
                    "grade": str(g),
                    "pdFitted": float(get(cells, "AG", row)),
                    "pdLower": float(get(cells, "AH", row)),
                    "pdUpper": float(get(cells, "AI", row)),
                }
            )

    moodys_map = []
    for row in range(3, 40):
        m = get(cells, "AO", row)
        if m:
            moodys_map.append({"moodys": str(m), "sp": str(get(cells, "AP", row)), "grade": str(get(cells, "AQ", row))})

    capital_structure = []
    for row in range(3, 10):
        s = get(cells, "AY", row)
        if s:
            name = SENIORITY_FIX.get(str(s), str(s))
            capital_structure.append({"seniority": name, "rank": int(get(cells, "AZ", row))})

    return {
        "responses": responses,
        "pdCalibration": {"alpha": float(get(cells, "K", 4)), "beta": float(get(cells, "L", 4))},
        "offtake": {"slope": float(get(cells, "I", 10)), "intercept": float(get(cells, "I", 11))},
        "sectors": sectors,
        "insolvencyScores": insolvency,
        "construction": {
            "pre": {"recoveryCosts": float(get(cells, "V", 3)), "adjustment": float(get(cells, "V", 4))},
            "post": {"recoveryCosts": float(get(cells, "W", 3)), "adjustment": float(get(cells, "W", 4))},
        },
        "collateralTypes": collateral_types,
        "scoreBands": score_bands,
        "riskGrades": risk_grades,
        "moodysMap": moodys_map,
        "capitalStructure": capital_structure,
        "lgdScaling": lgd_scaling,
    }


def extract_sovereigns(cells) -> list[dict]:
    out: list[dict] = []
    seen: set[str] = set()
    for row in range(2, 400):
        country = get(cells, "C", row)
        if not country or get(cells, "H", row) != "LT Issuer Rating":
            continue
        name = collapse_ws(country)
        if name in seen:
            continue
        seen.add(name)
        out.append({"country": name, "rating": str(get(cells, "I", row)).strip()})
    out.sort(key=lambda r: r["country"])
    return out


def _flush_group(glossary: dict[str, str], group: list) -> None:
    titles = [g for g in group if g[3]]
    if not titles:
        return
    title_row = titles[-1]
    title_idx = group.index(title_row)
    desc = " ".join(g[2] for g in group[title_idx + 1 :])
    if desc:
        glossary[title_row[2]] = desc
        if title_row[1] is not None:
            glossary[normalise_id(title_row[1])] = desc


def extract_glossary(cells) -> dict[str, str]:
    """Terms of Use: groups of rows ending with a 'Back' link; the last row carrying an id is the title."""
    glossary: dict[str, str] = {}
    max_row = max(r for r, _ in cells)
    group: list[tuple[int, object, str, bool]] = []
    for row in range(1, max_row + 1):
        b = get(cells, "B", row)
        c = get(cells, "C", row)
        d = get(cells, "D", row)
        if c is None:
            if b is not None:
                group = []  # sheet-level heading
            continue
        text = collapse_ws(c)
        is_title = b is not None or (len(text) < 120 and not re.match(r"^(This|These|Here|The |In the case|If )", text))
        if is_title and group and group[-1][3] is False:
            _flush_group(glossary, group)
            group = []
        group.append((row, b, text, is_title))
        if d == "Back":
            _flush_group(glossary, group)
            group = []
    return glossary


PD_SECTIONS = [
    ("A", "COUNTRY RISK", "A1", "Systemic country risk factors", 0.16, "sovereign", ["A1.1"]),
    ("A", "COUNTRY RISK", "A2", "Idiosyncratic country risk factors", 0.10, "standard", ["A2.1", "A2.2", "A2.3", "A2.4"]),
    ("B", "ENVIRONMENTAL FACTORS", "B", "Environmental factors", 0.039, "standard", ["B1.1", "B1.2"]),
    (
        "C",
        "CONSTRUCTION AND DEVELOPMENT RISK",
        "C",
        "Construction and development risk",
        0.1236,
        "standard",
        ["C1.1.1", "C1.1.2", "C1.1.3", "C1.2", "C1.3", "C1.4", "C1.5.1", "C1.5.2", "C1.6"],
    ),
    ("D", "MARKET SITUATION AND STRATEGIC RISK", "D1", "Competition", 0.0311, "standard", ["D1.1"]),
    ("D", "MARKET SITUATION AND STRATEGIC RISK", "D2", "Demand and outlook", 0.0535, "standard", ["D2.1"]),
    ("D", "MARKET SITUATION AND STRATEGIC RISK", "D3", "Technology risk", 0.01, "standard", ["D3.1", "D3.2"]),
    ("E", "BUSINESS AND OPERATING RISK", "E1", "Supply of inputs into operating processes (operational phase)", 0.0114, "standard", ["E1.1", "E1.2"]),
    ("E", "BUSINESS AND OPERATING RISK", "E2", "Off-takers", 0.0171, "offtake", ["E2.1", "E2.2.1", "E2.2.2", "E2.2.3"]),
    ("E", "BUSINESS AND OPERATING RISK", "E3", "Operational risks", 0.08, "standard", ["E3.1", "E3.2"]),
    ("E", "BUSINESS AND OPERATING RISK", "E4", "Quality of management team", 0.148, "standard", ["E4.1", "E4.2"]),
    ("F", "SECURITY PACKAGE", "F1", "Covenants", 0.0748, "standard", ["F1.1", "F1.2", "F1.3"]),
    ("F", "SECURITY PACKAGE", "F2", "Core covenant monitoring ratios", 0.034, "dscr", ["F2.1"]),
    ("G", "FINANCIAL ANALYSIS AND CASH FLOWS", "G1", "Cash flow analysis", 0.1175, "standard", ["G1.1", "G1.2", "G1.3", "G1.4"]),
]


def extract_pd_structure(pd_cells) -> list[dict]:
    # question text lives in the column to the right of the id (B->C or C->D)
    texts: dict[str, str] = {}
    max_row = max(r for r, _ in pd_cells)
    for row in range(1, max_row + 1):
        for letter in ("B", "C"):
            v = get(pd_cells, letter, row)
            if isinstance(v, str) and re.fullmatch(r"[A-H]\d(\.\d)*", v.strip()):
                nxt = get(pd_cells, get_column_letter(col(letter) + 1), row)
                if nxt:
                    texts.setdefault(v.strip(), collapse_ws(nxt))
    sections = []
    for group, group_title, sid, title, weight, kind, qids in PD_SECTIONS:
        sections.append(
            {
                "group": group,
                "groupTitle": group_title,
                "id": sid,
                "title": title,
                "weight": weight,
                "kind": kind,
                "questions": [{"id": q, "text": texts.get(q, q), "hasPrePost": True} for q in qids],
            }
        )
    return sections


def extract_restructure(cells) -> dict:
    letters = ["D", "F", "H", "J", "L", "N"]
    weight_letters = ["S", "T", "U", "V", "W", "X"]
    categories = []
    for letter, wl in zip(letters, weight_letters):
        categories.append(
            {
                "name": collapse_ws(get(cells, letter, 2)),
                "weight": float(get(cells, wl, 1)),
                "options": {str(get(cells, "B", r)): str(get(cells, letter, r)).strip() for r in (4, 5, 6)},
            }
        )
    scores = {str(get(cells, "R", r)): float(get(cells, "S", r)) for r in (4, 5, 6)}
    return {"categories": categories, "scores": scores}


def main() -> None:
    workbook, out_dir = sys.argv[1], Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)

    lgd_cells = load_sheet(workbook, "LGD Scorecard")
    rt = extract_reference_tables(load_sheet(workbook, "Reference Tables"), float(get(lgd_cells, "K", 27)))
    sov = extract_sovereigns(load_sheet(workbook, "Sovereign Ratings"))
    glossary = extract_glossary(load_sheet(workbook, "Terms of Use"))
    pd_structure = extract_pd_structure(load_sheet(workbook, "PD Scorecard"))
    restructure = extract_restructure(load_sheet(workbook, "Recovery Under Restructure"))

    for name, data in (
        ("referenceTables.json", rt),
        ("sovereignRatings.json", sov),
        ("glossary.json", glossary),
        ("pdScorecardStructure.json", pd_structure),
        ("recoveryUnderRestructure.json", restructure),
    ):
        (out_dir / name).write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        print("wrote", out_dir / name)


if __name__ == "__main__":
    main()

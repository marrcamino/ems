#!/usr/bin/env python3
"""Lint a .drawio file for flowchart grammar and layout problems.

Usage:  python3 check_flowchart.py diagram.drawio [--page "1 - Name"]

Reports structural problems only. It is a linter, not a judge: a finding you
can justify (a deliberate second end node, a note with no connector) is fine to
leave, but an unexplained one usually means the diagram lost its grammar.
"""

import argparse
import re
import sys
import xml.etree.ElementTree as ET

TAG = re.compile(r"<[^>]+>")
ENT = re.compile(r"&(nbsp|amp|lt|gt|quot|middot|#\d+);")


def text_of(value):
    if not value:
        return ""
    return ENT.sub(" ", TAG.sub(" ", value)).replace("\u00a0", " ").strip()


def classify(style):
    s = style or ""
    if "shape=note" in s:
        return "note"
    if s.startswith("text;") or "text;html" in s:
        return "text"
    if "swimlane" in s:
        return "lane"
    if "rhombus" in s:
        return "decision"
    if "parallelogram" in s:
        return "io"
    if "cylinder" in s or "shape=datastore" in s:
        return "data"
    if "ellipse" in s or ("rounded=1" in s and "arcSize" in s):
        return "terminator"
    if "rounded=1" in s:
        return "terminator"
    return "process"


def is_annotation_edge(style):
    s = style or ""
    return "dashed=1" in s and "endArrow=none" in s


def load_pages(path):
    root = ET.parse(path).getroot()
    pages = []
    for diagram in root.iter("diagram"):
        model_root = diagram.find(".//root")
        if model_root is None:
            continue
        pages.append((diagram.get("name") or diagram.get("id") or "?", model_root))
    return pages


def geometry(cell):
    g = cell.find("mxGeometry")
    if g is None:
        return None
    try:
        return (
            float(g.get("x", 0)), float(g.get("y", 0)),
            float(g.get("width", 0)), float(g.get("height", 0)),
        )
    except ValueError:
        return None


def check_page(name, model_root):
    findings = []
    nodes, edges = {}, []

    for cell in model_root:
        style = cell.get("style") or ""
        if cell.get("vertex") == "1":
            nodes[cell.get("id")] = {
                "id": cell.get("id"),
                "kind": classify(style),
                "label": text_of(cell.get("value")),
                "parent": cell.get("parent"),
                "geom": geometry(cell),
            }
        elif cell.get("edge") == "1":
            edges.append({
                "id": cell.get("id"),
                "src": cell.get("source"),
                "dst": cell.get("target"),
                "label": text_of(cell.get("value")),
                "annotation": is_annotation_edge(style),
            })

    flow_kinds = {"terminator", "process", "decision", "io", "data"}

    def add(code, msg):
        findings.append((code, msg))

    # broken references
    for e in edges:
        for end in ("src", "dst"):
            ref = e[end]
            if ref is None:
                add("dangling-edge", f"edge {e['id']} has no {end} — it is not attached to anything")
            elif ref not in nodes:
                add("broken-edge", f"edge {e['id']} points at missing cell '{ref}'")

    def shape_ok(ref):
        return ref in nodes and nodes[ref]["kind"] in flow_kinds

    flow_edges = [e for e in edges
                  if not e["annotation"] and shape_ok(e["src"]) and shape_ok(e["dst"])]

    # A page only gets flowchart checks if it actually is one. Comparison panels,
    # glossaries and legends are legitimate pages that would otherwise drown the
    # report in findings about "boxes with no arrows".
    connected = {e["src"] for e in flow_edges} | {e["dst"] for e in flow_edges}
    kinds_connected = {nodes[i]["kind"] for i in connected}
    if len(flow_edges) < 2 or not (kinds_connected & {"terminator", "decision"}):
        return None  # signals "not a flowchart page"

    flow_nodes = {i: nodes[i] for i in connected}

    out, inn = {}, {}
    for e in flow_edges:
        out.setdefault(e["src"], []).append(e)
        inn.setdefault(e["dst"], []).append(e)

    # A write to a table is not a branch in the path, so it does not count as a
    # second exit when asking whether a step splits without a question.
    def control_exits(nid):
        return [e for e in out.get(nid, []) if flow_nodes[e["dst"]]["kind"] != "data"]

    for nid, n in flow_nodes.items():
        outs = out.get(nid, [])
        ctrl = control_exits(nid)
        ins = inn.get(nid, [])
        short = n["label"][:48] or f"<unlabelled {n['kind']}>"

        if n["kind"] == "decision":
            if len(ctrl) < 2:
                add("decision-one-exit",
                    f"decision '{short}' has {len(ctrl)} exit(s) — a question needs at least two")
            for e in ctrl:
                if not e["label"]:
                    dest = flow_nodes[e["dst"]]["label"][:32] or e["dst"]
                    add("unlabelled-exit",
                        f"decision '{short}' has an unlabelled exit to '{dest}' — name the condition on the arrow")
            labels = [e["label"].lower() for e in ctrl if e["label"]]
            if len(labels) != len(set(labels)):
                add("duplicate-exit", f"decision '{short}' has two exits with the same label")
        elif len(ctrl) > 1 and n["kind"] != "data":
            add("branch-without-decision",
                f"{n['kind']} '{short}' has {len(ctrl)} outgoing paths — the question that splits them is missing")

        if not ins and n["kind"] != "terminator":
            add("orphan", f"{n['kind']} '{short}' has no incoming arrow — nothing leads to it")
        if not outs and n["kind"] not in ("terminator", "data"):
            add("dead-end", f"{n['kind']} '{short}' has no outgoing arrow and is not an end node")

        words = len(n["label"].split())
        if words > 25:
            add("prose-in-node",
                f"{n['kind']} '{short}...' holds {words} words — move the explanation into a note")
        if re.search(r"\b(Meaning|Note that|This is because|In other words)\b", n["label"], re.I):
            add("why-in-node",
                f"{n['kind']} '{short}...' explains why inside the node — that belongs in a note")

    # A cylinder is a noun and its arrow is a verb. "writes" leaves the reader
    # unable to tell a new row from a changed one, which is usually the point.
    ops = re.compile(r"\b(select|insert|update|delete|upsert|count|truncate)\b", re.I)
    verb_in_noun = re.compile(
        r"\b(updated|inserted|deleted|added|written|overwritten|created|removed|read.only)\b", re.I)

    def op_family(label):
        m = ops.search(label or "")
        if not m:
            return None
        word = m.group(1).lower()
        return "read" if word in ("select", "count") else "write"

    touching = {}
    for e in flow_edges:
        for a, b in ((e["src"], e["dst"]), (e["dst"], e["src"])):
            if flow_nodes[a]["kind"] == "data":
                touching.setdefault(a, []).append(e)
                table = flow_nodes[a]["label"][:28] or a
                if not ops.search(e["label"]):
                    add("operation-not-named",
                        f"arrow at table '{table}' says '{e['label'] or '<no label>'}' — "
                        "name the operation: SELECT / INSERT / UPDATE / DELETE")
                elif len(e["label"].split()) > 1:
                    add("over-labelled-arrow",
                        f"arrow at table '{table}' says '{e['label']}' — the arrow carries the bare verb; "
                        "row counts and conditions belong in the cylinder or a note")

    for nid, n in flow_nodes.items():
        if n["kind"] != "data":
            continue
        short = n["label"][:28] or nid
        if verb_in_noun.search(n["label"]):
            add("operation-in-cylinder",
                f"cylinder '{short}' describes the operation — the cylinder names the table, the arrow names the verb")
        if re.search(r"\band\b", n["label"], re.I):
            add("two-tables-one-cylinder",
                f"cylinder '{short}' joins two things with \"and\" — if that is two tables, "
                "draw one cylinder per table with its own arrow")
        families = {op_family(e["label"]) for e in touching.get(nid, [])} - {None}
        if len(families) > 1:
            add("mixed-operations",
                f"cylinder '{short}' is both read and written — split it into one cylinder per touch point")

    loose = [n for i, n in nodes.items()
             if n["kind"] in flow_kinds and i not in connected and len(n["label"].split()) <= 25]
    if loose:
        add("unconnected-box",
            f"{len(loose)} box(es) sit near the flow with no arrows: "
            + ", ".join(f"'{n['label'][:28] or n['id']}'" for n in loose[:4])
            + " — connect them if they are steps, restyle them if they are captions")

    kinds = [n["kind"] for n in flow_nodes.values()]
    rect_share = kinds.count("process") / len(kinds)
    if len(flow_nodes) >= 6 and rect_share > 0.65:
        add("no-shape-grammar",
            f"{rect_share:.0%} of nodes are plain rectangles — check whether any are really a dialog, a data write or a question")
    if "terminator" not in kinds:
        add("no-terminator", "no start or end node on this page")
    if "decision" not in kinds and len(flow_nodes) >= 5:
        add("no-decision",
            "no decision node — if the process really has no branches, consider whether a flowchart is the right form")

    # overlapping geometry, compared only within the same parent
    by_parent = {}
    for n in nodes.values():
        if n["kind"] in ("lane", "text") or not n["geom"]:
            continue
        by_parent.setdefault(n["parent"], []).append(n)
    for group in by_parent.values():
        for i, a in enumerate(group):
            ax, ay, aw, ah = a["geom"]
            for b in group[i + 1:]:
                bx, by, bw, bh = b["geom"]
                if ax < bx + bw and bx < ax + aw and ay < by + bh and by < ay + ah:
                    add("overlap",
                        f"'{a['label'][:28] or a['id']}' and '{b['label'][:28] or b['id']}' overlap on the canvas")

    return findings


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--page", help="only check the page with this name")
    args = ap.parse_args()

    total = 0
    for name, model_root in load_pages(args.path):
        if args.page and args.page != name:
            continue
        findings = check_page(name, model_root)
        print(f"\n=== page: {name} ===")
        if findings is None:
            print("  not a flowchart page — skipped")
            continue
        if not findings:
            print("  clean")
            continue
        total += len(findings)
        for code, msg in findings:
            print(f"  [{code}] {msg}")

    print(f"\n{total} finding(s)")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
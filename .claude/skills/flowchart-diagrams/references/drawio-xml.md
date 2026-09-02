# Writing .drawio XML by hand

Contents: [File shape](#file-shape) · [Lanes and child coordinates](#lanes-and-child-coordinates) · [Edges](#edges) · [Routing channels](#routing-channels) · [A vertical grid](#a-vertical-grid) · [Things that silently break](#things-that-silently-break) · [A worked critique](#a-worked-critique)

## File shape

```xml
<mxfile host="app.diagrams.net" type="device">
  <diagram id="flow" name="1 - The flow">
    <mxGraphModel dx="1200" dy="900" grid="1" gridSize="10" page="1"
                  pageWidth="1654" pageHeight="1169">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <!-- everything else here, parent="1" or parent="<lane id>" -->
      </root>
    </mxGraphModel>
  </diagram>
  <diagram id="words" name="0 - Words used here"> ... </diagram>
</mxfile>
```

One `<diagram>` per page; the tab order in draw.io follows document order. Cells `0` and `1` must exist and come first. Every id has to be unique **within a page**, and reusing a `<diagram id>` across pages is harmless but confusing — give each a distinct one.

Labels are HTML, so escape them: `&lt;b&gt;bold&lt;/b&gt;`, `&lt;br&gt;` for a line break, `&amp;nbsp;` for a hard space. A literal `&` in text has to be `&amp;amp;`.

## Lanes and child coordinates

A lane is a vertex whose style contains `swimlane`. Nodes inside it are ordinary vertices with `parent="<lane id>"`.

**Child geometry is relative to the lane's top-left corner, and the lane's title bar is inside that box.** With `startSize=40`, a child at `y=70` sits 30px below the title bar. This is the single most common source of "why is my node outside the lane" — the child x/y are not canvas coordinates.

```xml
<mxCell id="laneB" value="Server"
        style="swimlane;html=1;horizontal=1;startSize=40;fillColor=none;strokeColor=#999999;collapsible=0;"
        vertex="1" parent="1">
  <mxGeometry x="520" y="140" width="600" height="1520" as="geometry" />
</mxCell>
<mxCell id="step" value="A step" style="rounded=0;whiteSpace=wrap;html=1;"
        vertex="1" parent="laneB">
  <mxGeometry x="80" y="190" width="400" height="80" as="geometry" />
</mxCell>
```

Set `collapsible=0` so a reader cannot accidentally fold a lane shut. Avoid `childLayout=stackLayout` on the pool — it re-flows children and will fight the coordinates you chose.

## Edges

Keep every edge `parent="1"`, even when its endpoints live in different lanes. An edge parented to a lane will be clipped by that lane.

```xml
<mxCell id="x2" value="No" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;fontStyle=1;"
        edge="1" parent="1" source="dec1" target="pSimple">
  <mxGeometry relative="1" as="geometry" />
</mxCell>
```

- `edgeStyle=orthogonalEdgeStyle` for right-angle routing, which is the flowchart convention.
- The edge label goes in `value` — that is where a branch condition belongs.
- Annotation connectors to notes: `dashed=1;endArrow=none;` so they read as commentary rather than as a step.

## Routing channels

drawio routes an unconstrained orthogonal edge through whatever is in the way, so a merge arrow from the first branch to the join step will happily cut straight through the second branch's box. Two fixes, in order of preference:

**Reserve an empty column inside the lane.** Place branch boxes at `x=80` rather than `x=0`, leaving 80px of clear space down the left. Then pin the merge edge to that side:

```
exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;
```

The arrow leaves the left edge, runs down the empty column, and enters the join from its left.

**Or stagger the y values** so the horizontal segment passes above or below the obstacle rather than through it.

Crossings between a control arrow and a data arrow are acceptable and normal. An arrow crossing _through a box_ is not.

## A vertical grid

Pick row positions in advance and keep 60–90px of clear space between rows so labels have room. A layout that works for a branch-and-merge flow:

| Row                  | y (lane-relative) |
| -------------------- | ----------------- |
| start                | 70                |
| first decision       | 180 (h 150)       |
| short-path step      | 190               |
| main step            | 410               |
| what the person sees | 570               |
| second decision      | 730 (h 170)       |
| branch one           | 930               |
| branch two           | 1110              |
| join                 | 1290              |
| end                  | 1400              |

Diamonds need to be wide: 400×150 for a one-line question, more if the question carries a sub-list. A cramped diamond wraps its text into an unreadable sliver.

## Cylinders and their arrows

Because one cylinder is one table at one touch point, a step that writes two tables gets two arrows to two cylinders, and a table read early then written later appears twice. That is more shapes than feels necessary until someone asks what the step does to the database and the diagram answers without ambiguity.

```xml
<mxCell id="x12" value="UPDATE" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;"
        edge="1" parent="1" source="pRepair" target="dbHistory" />
<mxCell id="x13" value="INSERT" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;"
        edge="1" parent="1" source="pRepair" target="dbLog" />
```

Keep the arrow label to the single verb. If _which_ rows matters, it belongs in the cylinder as a small second line, not on the arrow — the arrow is the most crowded part of the canvas and the least able to carry detail.

## Things that silently break

- An `mxGeometry` without `as="geometry"` is ignored, and the shape lands at 0,0.
- `source`/`target` pointing at an id that does not exist produces an edge floating in space with no error.
- Two vertices with the same id: draw.io keeps one and drops the other.
- Notes overlapping nodes: nothing complains, it just looks broken. `scripts/check_flowchart.py` catches this.

## A worked critique

A real diagram that failed, and why — useful as a pattern to recognise. It described what happens when an admin saves an edited employee record. It had a green start oval, one orange diamond, arrows throughout, and a "Done" ellipse.

What was wrong underneath:

1. **Everything else was the same rectangle** — a modal dialog, a read-only count, two database writes, and the two possible answers all shared one shape. 76% of the page was `rounded=0` blue boxes, so shape carried no information.
2. **A process box had two outgoing arrows, both unlabelled.** The box was the dialog; the branch was the admin's answer. The question that split the path existed only in the reader's head, and the only way to tell the arrows apart was to read the box each one landed in.
3. **The two answers were drawn as nodes.** They are edge labels — conditions, not steps. Making them boxes meant each held a branch label, some UI copy, and a parenthetical, all at once.
4. **Two real branches lived in sticky notes.** One note explained that a permission gate greys out one of the options; that is a decision. And the dialog had no Cancel path at all, although every dialog has one.
5. **The client/server boundary was invisible**, hiding that the flow crossed to the server twice — once to fetch a count, once to write. A box had to say "nothing is written yet" in prose because the structure could not show it.
6. **A glossary shared the canvas with the flow**, competing for the reader's attention, and two notes overlapped a terminator.

The rebuild: three lanes (browser / server / database), the dialog as a parallelogram, a diamond for the admin's answer with three named exits including Cancel, a diamond for the permission gate, cylinders for each table touched, the explanations moved into notes, and the glossary moved to its own page. Same content, and now a reader can trace one path with a finger.

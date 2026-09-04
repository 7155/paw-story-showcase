"""Regenerate the editable PAW interview-story diagrams and public SVGs."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from excalidraw_mcp.server import create_diagram, export_diagram


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "diagrams"
PUBLIC_DIR = ROOT / "public" / "evidence" / "agents"


# The diagram engine's stock dark palette is intentionally neutral. The story
# page uses warm paper, near-black green panels and one PAW mint accent. Keep
# the editable source and exported SVG on that same visual system so both text
# and frames remain legible at resume/interview scale.
PAW_PALETTE = {
    "#1e1e1e": "#141a17",  # canvas
    "#252525": "#19231e",  # lane / secondary surface
    "#2d2d2d": "#213029",  # card surface
    "#4d4d4d": "#344b40",  # subtle frame
    "#909296": "#adc1b7",  # secondary text / connector
    "#a0a0a0": "#789988",  # architecture frame / connector
    "#c0c0c0": "#c7d8cf",  # connector label
    "#e0e0e0": "#edf5f0",  # primary text
    "#ff922b": "#70d49f",  # focal stroke / text
    "#5c3a1a": "#173d2b",  # focal surface
}

FOCAL_LABELS = {
    "Pi Session Runtime\nTranscript + Agent / Tool loop",
    "Durable Events\nTrace + frozen Eval",
}


def _require_success(result: str) -> None:
    if result.startswith("Error:"):
        raise RuntimeError(result)
    print(result)


def _apply_paw_palette(name: str) -> None:
    """Normalize generated colors and promote the critical ownership path."""

    source_path = SOURCE_DIR / f"{name}.excalidraw"
    data: dict[str, Any] = json.loads(source_path.read_text(encoding="utf-8"))

    app_state = data.setdefault("appState", {})
    app_state["viewBackgroundColor"] = PAW_PALETTE["#1e1e1e"]

    elements = data.get("elements", [])
    elements_by_id = {element.get("id"): element for element in elements}

    for element in elements:
        for color_key in ("strokeColor", "backgroundColor"):
            current = element.get(color_key)
            if current in PAW_PALETTE:
                element[color_key] = PAW_PALETTE[current]

        # In the ownership map, Runtime is execution truth and durable events
        # are proof. Accenting those two boxes makes that boundary glanceable.
        if element.get("type") == "text" and element.get("text") in FOCAL_LABELS:
            element["strokeColor"] = PAW_PALETTE["#ff922b"]
            container = elements_by_id.get(element.get("containerId"))
            if container:
                container["strokeColor"] = PAW_PALETTE["#ff922b"]
                container["backgroundColor"] = PAW_PALETTE["#5c3a1a"]

        # The thick Root and receipt paths are the architecture's critical
        # spine. Ordinary and dashed edges stay quiet.
        if element.get("type") == "arrow" and element.get("strokeWidth", 0) >= 4:
            element["strokeColor"] = PAW_PALETTE["#ff922b"]

    source_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def _export(name: str) -> None:
    _apply_paw_palette(name)
    _require_success(
        export_diagram(
            input_path=str(SOURCE_DIR / f"{name}.excalidraw"),
            output_path=str(PUBLIC_DIR / f"{name}.svg"),
            format="svg",
        )
    )


def build_runtime_ownership() -> None:
    _require_success(
        create_diagram(
            output_path=str(SOURCE_DIR / "paw-runtime-ownership.excalidraw"),
            diagram_type="architecture",
            direction="TD",
            theme="dark",
            nodes=[
                {"id": "intent", "label": "PAWOS Command\n用户 Goal 与控制", "shape": "stadium"},
                {"id": "gateway", "label": "Typed Gateway\n合同、权限、回执", "component_type": "api_gateway"},
                {"id": "room", "label": "Light Room\n身份、派发、公共顺序"},
                {"id": "context", "label": "Memory + Knowledge\n获准的有界上下文"},
                {"id": "session", "label": "Pi Session Runtime\nTranscript + Agent / Tool loop", "shape": "stadium"},
                {"id": "agents", "label": "Partner / Tool Agent\n普通或私有子 Session"},
                {"id": "tools", "label": "Tools + MCP\n策略内执行能力"},
                {"id": "evidence", "label": "Durable Events\nTrace + frozen Eval", "shape": "parallelogram"},
                {"id": "projection", "label": "PAWOS Read Model\n只投影 Runtime 真相", "shape": "stadium"},
            ],
            connections=[
                {"from_id": "intent", "to_id": "gateway", "label": "typed intent"},
                {"from_id": "gateway", "to_id": "room", "label": "Room command"},
                {"from_id": "room", "to_id": "session", "label": "Root dispatch", "style": "thick"},
                {"from_id": "session", "to_id": "agents", "label": "TaskBrief", "style": "dashed"},
                {"from_id": "session", "to_id": "tools", "label": "tool call"},
                {"from_id": "session", "to_id": "context", "label": "scoped retrieve", "style": "dashed"},
                {"from_id": "session", "to_id": "evidence", "label": "receipts", "style": "thick"},
                {"from_id": "evidence", "to_id": "projection", "label": "snapshot + SSE"},
            ],
        )
    )
    _export("paw-runtime-ownership")


def build_feature_slice() -> None:
    _require_success(
        create_diagram(
            output_path=str(SOURCE_DIR / "paw-feature-slice.excalidraw"),
            diagram_type="process",
            theme="dark",
            spec={
                "title": "一个功能怎样纵切",
                "subtitle": "按可验收闭环切责任，不按前端 / 后端堆任务",
                "actors": ["USER / GOAL", "PAWOS", "ROOM", "PI SESSION", "TOOL GATEWAY", "TRACE / EVAL"],
                "steps": [
                    {"id": "goal", "label": "Goal + 可观察验收", "lane": "USER / GOAL"},
                    {"id": "intent", "label": "提交 typed intent", "lane": "PAWOS"},
                    {"id": "root", "label": "Root + 可选派发", "lane": "ROOM"},
                    {"id": "slice", "label": "计划最小纵切", "lane": "PI SESSION", "focal": True},
                    {"id": "execute", "label": "授权并执行 Tool", "lane": "TOOL GATEWAY"},
                    {"id": "integrate", "label": "整合 AgentResult", "lane": "PI SESSION"},
                    {"id": "gate", "label": "回执 + frozen Eval", "lane": "TRACE / EVAL", "focal": True},
                    {"id": "terminal", "label": "单一终态\nKeep / Reject / Promote", "lane": "ROOM"},
                    {"id": "render", "label": "投影同一 Runtime 状态", "lane": "PAWOS"},
                ],
                "connections": [
                    {"from_id": "goal", "to_id": "intent"},
                    {"from_id": "intent", "to_id": "root"},
                    {"from_id": "root", "to_id": "slice", "label": "accepted dispatch"},
                    {"from_id": "slice", "to_id": "execute", "focal": True},
                    {"from_id": "execute", "to_id": "integrate", "label": "terminal receipt"},
                    {"from_id": "integrate", "to_id": "gate"},
                    {"from_id": "gate", "to_id": "terminal", "label": "pass or reject", "focal": True},
                    {"from_id": "terminal", "to_id": "render", "label": "ordered event"},
                ],
            },
        )
    )
    _export("paw-feature-slice")


def build_project_story_spine() -> None:
    _require_success(
        create_diagram(
            output_path=str(SOURCE_DIR / "project-story-spine.excalidraw"),
            diagram_type="tree",
            theme="dark",
            spec={
                "title": "一个项目怎样讲通",
                "subtitle": "八个问题，四组证据",
                "direction": "TD",
                "nodes": [
                    {"id": "project", "label": "PROJECT\n一句话价值主张"},
                    {"id": "context", "label": "01 WHY + 02 SCOPE\n为什么存在，目标与约束", "parent": "project"},
                    {"id": "ownership", "label": "03 OWNER + 04 SYSTEM\n我的职责，架构与核心链路", "parent": "project"},
                    {"id": "decision", "label": "05 FAILURE + 06 CHOICE\n根因，方案与取舍", "parent": "project", "focal": True},
                    {"id": "proof", "label": "07 PROOF + 08 RESULT\nEval、指标、结果与边界", "parent": "project", "focal": True},
                ],
            },
        )
    )
    _export("project-story-spine")


def main() -> None:
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    build_runtime_ownership()
    build_feature_slice()
    build_project_story_spine()


if __name__ == "__main__":
    main()

"""
pytest conftest.py — stubs heavy dependencies so fishtank_tool.py can be
imported in a plain Python environment (no rich/dotenv/requests required).

This conftest runs before any test module is collected, inserting the stubs
into sys.modules at the earliest possible point.
"""
import sys
import types


def _make_stub(name: str) -> types.ModuleType:
    mod = types.ModuleType(name)
    return mod


_STUBS: dict[str, types.ModuleType] = {}

# ---- dotenv ----
_dotenv = _make_stub("dotenv")
_dotenv.load_dotenv = lambda *a, **kw: None  # type: ignore[attr-defined]
_STUBS["dotenv"] = _dotenv

# ---- rich.box ----
_rich_box = _make_stub("rich.box")
_rich_box.ROUNDED = None  # type: ignore[attr-defined]
_STUBS["rich.box"] = _rich_box

# ---- rich.markdown ----
_rich_md = _make_stub("rich.markdown")
_rich_md.Markdown = type("Markdown", (), {"__init__": lambda s, t: None})  # type: ignore[attr-defined]
_STUBS["rich.markdown"] = _rich_md

# ---- rich.panel ----
_rich_panel = _make_stub("rich.panel")
_rich_panel.Panel = type("Panel", (), {"fit": staticmethod(lambda *a, **kw: None)})  # type: ignore[attr-defined]
_STUBS["rich.panel"] = _rich_panel

# ---- rich.table ----
_Table = type(
    "Table",
    (),
    {
        "__init__": lambda s, *a, **kw: None,
        "add_column": lambda s, *a, **kw: None,
        "add_row": lambda s, *a, **kw: None,
    },
)
_rich_table = _make_stub("rich.table")
_rich_table.Table = _Table  # type: ignore[attr-defined]
_STUBS["rich.table"] = _rich_table

# ---- rich.console ----
_Console = type(
    "Console",
    (),
    {
        "__init__": lambda s: None,
        "print": lambda s, *a, **kw: None,
        "rule": lambda s, *a, **kw: None,
        "input": lambda s, *a, **kw: "",
        "clear": lambda s: None,
    },
)
_rich_console = _make_stub("rich.console")
_rich_console.Console = _Console  # type: ignore[attr-defined]
_STUBS["rich.console"] = _rich_console

# ---- rich (top-level) ----
_rich = _make_stub("rich")
_rich.box = _rich_box  # type: ignore[attr-defined]
_STUBS["rich"] = _rich

# ---- requests ----
_STUBS["requests"] = _make_stub("requests")

# Inject into sys.modules only if not already present (don't override real installs)
for _name, _stub in _STUBS.items():
    sys.modules.setdefault(_name, _stub)

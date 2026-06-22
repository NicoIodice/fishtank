"""
Unit tests for fishtank_tool.py pure utility functions.

Dependencies are stubbed by conftest.py so no venv is required.

Run:
    cd support/tools
    python -m pytest tests/ -v
"""
from __future__ import annotations

import sys
from pathlib import Path

# Ensure support/tools/ is on the path so we can import fishtank_tool directly.
_TOOLS_DIR = Path(__file__).parent.parent
if str(_TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(_TOOLS_DIR))

import fishtank_tool  # noqa: E402  (import after path fix)

to_wsl_path = fishtank_tool.to_wsl_path


class TestToWslPath:
    """Tests for the to_wsl_path() path-conversion utility."""

    def test_windows_c_drive(self):
        assert to_wsl_path(r"C:\Users\foo") == "/mnt/c/Users/foo"

    def test_windows_d_drive(self):
        assert to_wsl_path(r"D:\projects\bar") == "/mnt/d/projects/bar"

    def test_windows_lowercase_drive(self):
        assert to_wsl_path(r"c:\data") == "/mnt/c/data"

    def test_unix_path_passthrough(self):
        assert to_wsl_path("/mnt/c/already/wsl") == "/mnt/c/already/wsl"

    def test_relative_path_passthrough(self):
        assert to_wsl_path("./mocks") == "./mocks"

    def test_unc_path_passthrough(self):
        assert to_wsl_path(r"\\server\share") == r"\\server\share"

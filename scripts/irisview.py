#!/usr/bin/env python3
"""Run the IrisView Kit CLI with a development-only host gate bypass.

The Kit only whitelists Ubuntu 22.04/26.04. On other Linux hosts (Fedora,
Arch, ...) we patch `developer_kit_host.is_supported_host` in memory and
print a warning. Set IRISVIEW_STRICT_HOST=1 to keep the official check.
"""

from __future__ import annotations

import os
import runpy
import sys
from pathlib import Path

SUPPORTED_HOSTS = {("ubuntu", "22.04"), ("ubuntu", "26.04")}


def os_release() -> tuple[str, str]:
    values: dict[str, str] = {}
    try:
        lines = Path("/etc/os-release").read_text(encoding="utf-8").splitlines()
    except OSError:
        return "unknown", "unknown"
    for line in lines:
        key, separator, value = line.partition("=")
        if separator:
            values[key] = value.strip().strip('"')
    return values.get("ID", "unknown"), values.get("VERSION_ID", "unknown")


def main() -> int:
    kit_root = Path(
        os.environ.get(
            "FUSIONUI_DEVELOPER_KIT_ROOT",
            str(Path(__file__).resolve().parent.parent / "IrisView-Developer-Kit-v1.0.0"),
        )
    ).resolve()
    sdk = kit_root / "sdk" / "fusionui-app-sdk"
    entry = sdk / "fusionui_sdk.py"
    if not entry.is_file():
        print(f"ERROR: IrisView Kit not found: {kit_root}", file=sys.stderr)
        return 2

    os.environ.setdefault("PYTHONDONTWRITEBYTECODE", "1")
    os.environ["FUSIONUI_DEVELOPER_KIT_ROOT"] = str(kit_root)
    sys.path.insert(0, str(sdk))

    host_id, host_version = os_release()
    if (host_id, host_version) not in SUPPORTED_HOSTS:
        if os.environ.get("IRISVIEW_STRICT_HOST") == "1":
            print(
                f"warning: host {host_id} {host_version} is not supported by the Kit; "
                "IRISVIEW_STRICT_HOST=1 keeps the official rejection.",
                file=sys.stderr,
            )
        else:
            try:
                import developer_kit_host

                developer_kit_host.is_supported_host = lambda *_args, **_kwargs: True
            except ImportError as error:
                print(f"warning: cannot patch host gate: {error}", file=sys.stderr)
            else:
                print(
                    f"warning: host {host_id} {host_version} is outside the Kit whitelist "
                    "(Ubuntu 22.04/26.04); OS check bypassed for development. "
                    "Set IRISVIEW_STRICT_HOST=1 to disable.",
                    file=sys.stderr,
                )

    sys.argv[0] = str(entry)
    runpy.run_path(str(entry), run_name="__main__")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

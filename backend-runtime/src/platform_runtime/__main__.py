"""
Production entrypoint: `python -m platform_runtime`.

Reads configuration from environment variables:

    PLATFORM_AGENTS_DIR   directory to scan for `agent.yaml` files (required)
    PLATFORM_HOST         bind host (default: 127.0.0.1)
    PLATFORM_PORT         bind port (default: 8080)
    PLATFORM_LOG_LEVEL    uvicorn log level (default: info)

Importing the adapters here is what activates them: the `@register_adapter`
decorator only fires once the adapter module is imported. New adapters get
one more import line here.
"""

from __future__ import annotations

import logging
import os
import sys

import uvicorn

# Activate built-in adapters by importing them. Each registers itself with
# the adapter registry on import.
from .adapters import langchain_adapter  # noqa: F401
from .registry import AgentRegistry
from .server import create_app


def main() -> None:
    agents_dir = os.environ.get("PLATFORM_AGENTS_DIR")
    if not agents_dir:
        sys.stderr.write(
            "PLATFORM_AGENTS_DIR is required (path to a directory "
            "containing agent folders with agent.yaml manifests).\n"
        )
        sys.exit(2)

    log_level = os.environ.get("PLATFORM_LOG_LEVEL", "info")
    logging.basicConfig(level=log_level.upper())

    registry = AgentRegistry()
    loaded = registry.discover(agents_dir)
    logging.getLogger("platform_runtime").info(
        "Loaded %d agent(s): %s",
        len(loaded),
        [a.manifest.agent_id for a in loaded],
    )

    app = create_app(registry)
    uvicorn.run(
        app,
        host=os.environ.get("PLATFORM_HOST", "127.0.0.1"),
        port=int(os.environ.get("PLATFORM_PORT", "8080")),
        log_level=log_level,
    )


if __name__ == "__main__":
    main()

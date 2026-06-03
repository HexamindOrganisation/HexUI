"""Console entrypoint: ``python -m agent_server``."""

from __future__ import annotations

import logging

import uvicorn

from .config import get_settings
from .server.app import create_app

app = create_app()


def main() -> None:
    s = get_settings()
    # uvicorn only configures its own loggers; add a root handler so the
    # reference agents' logging (e.g. the assembled prompt in LLMAgent) shows.
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    uvicorn.run(app, host=s.host, port=s.port)


if __name__ == "__main__":
    main()

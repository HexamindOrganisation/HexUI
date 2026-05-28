"""FastAPI app factory + lifespan.

Mirrors `platform_runtime.server.app.create_app`: a single factory that wires
routers + lifespan. The lifespan owns the engine — created on startup,
disposed on shutdown.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .. import runtime_client
from ..db import dispose_engine, init_engine
from ..routes import auth as auth_routes
from ..routes import conversations as conversations_routes
from ..routes import folders as folders_routes
from ..routes import me as me_routes
from ..routes import me_keys as me_keys_routes
from ..routes import proxy as proxy_routes


logger = logging.getLogger("platform_backend.server")


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(_: FastAPI):
        init_engine()
        runtime_client.init_client()
        logger.info("platform_backend ready")
        try:
            yield
        finally:
            await runtime_client.dispose_client()
            await dispose_engine()

    app = FastAPI(title="platform-backend", version="0.1.0", lifespan=lifespan)
    app.include_router(auth_routes.router)
    app.include_router(me_routes.router)
    app.include_router(me_keys_routes.router)
    app.include_router(folders_routes.router)
    app.include_router(conversations_routes.router)
    app.include_router(proxy_routes.router)
    return app

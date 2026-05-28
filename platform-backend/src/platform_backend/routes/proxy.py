"""Read-only proxy of the runtime's agent endpoints.

Five GETs, JWT-required. Bodies pass through; status codes preserved so a
404 from the runtime stays a 404 to the browser. Plus `/ui` keeps the
runtime's `text/yaml` content-type so the FE can render the raw YAML.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from fastapi.responses import JSONResponse

from .. import runtime_client
from ..auth.deps import current_user
from ..models.user import User


router = APIRouter(prefix="/agents", tags=["proxy"])


@router.get("")
async def list_agents(_: User = Depends(current_user)) -> list:
    return await runtime_client.list_agents()


@router.get("/{agent_id}/metadata")
async def get_metadata(agent_id: str, _: User = Depends(current_user)):
    status_code, body = await runtime_client.get_metadata(agent_id)
    return JSONResponse(body, status_code=status_code)


@router.get("/{agent_id}/tools")
async def get_tools(agent_id: str, _: User = Depends(current_user)):
    status_code, body = await runtime_client.get_tools(agent_id)
    return JSONResponse(body, status_code=status_code)


@router.get("/{agent_id}/health")
async def get_health(agent_id: str, _: User = Depends(current_user)):
    status_code, body = await runtime_client.get_health(agent_id)
    return JSONResponse(body, status_code=status_code)


@router.get("/{agent_id}/ui")
async def get_ui(agent_id: str, _: User = Depends(current_user)) -> Response:
    status_code, content_type, body = await runtime_client.get_ui_yaml(agent_id)
    return Response(
        content=body,
        status_code=status_code,
        media_type=content_type or "text/yaml",
    )

"""Reference developer backend — the executable spec for the HexaUI contract."""

import os

# google-adk >=2.x defaults the experimental JSON_SCHEMA_FOR_FUNC_DECL feature
# on, which writes tool schemas to `parameters_json_schema` and leaves the
# legacy `parameters` field empty. HexGate registration reads `parameters`, so
# pin ADK to the legacy schema. setdefault keeps an explicit override possible.
os.environ.setdefault("ADK_DISABLE_JSON_SCHEMA_FOR_FUNC_DECL", "1")

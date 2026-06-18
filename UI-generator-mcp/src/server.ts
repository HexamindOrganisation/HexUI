#!/usr/bin/env node
/**
 * UI Generator MCP server.
 *
 * Gives an agent the tools to author a small, display-only HexUI document that
 * the front-app renders inside an `llm-ui-response` widget:
 *
 *   list_rules()              → the YAML envelope, layout/sizing rules, limits
 *   list_elements()           → the catalog of available elements
 *   describe_element(name)    → full field spec + a ready-to-paste example
 *   validate_ui(yaml_text)    → {ok} or precise, fixable errors
 *
 * Authoring loop: list_rules → list_elements → describe_element(…) → write YAML
 * → validate_ui → (fix → validate_ui)* → emit the UI on the run stream.
 *
 * All validation/introspection logic lives in `agent-ui/llm`, the same package
 * (and the same schemas) the widget renders with, so this server can never
 * describe or accept UI the widget would reject.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { listRules } from "agent-ui/llm";
import {
  handleListElements,
  handleDescribeElement,
  handleListRules,
  handleValidateUi,
} from "./handlers.js";

const server = new McpServer({
  name: "ui-generator",
  version: "0.1.0",
});

const json = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

server.registerTool(
  "list_elements",
  {
    title: "List UI elements",
    description:
      "List every UI element available for an llm-ui-response document, each with a one-line summary. Call describe_element for full specs.",
    inputSchema: {},
  },
  async () => json(handleListElements()),
);

server.registerTool(
  "describe_element",
  {
    title: "Describe a UI element",
    description:
      "Full specification of one element: its fields (type, required, constraints), worked examples, a ready-to-paste YAML snippet, and the raw JSON Schema.",
    inputSchema: {
      element_name: z
        .string()
        .describe("Element type, e.g. 'chart', 'table', 'markdown'."),
    },
  },
  async ({ element_name }) => json(handleDescribeElement(element_name)),
);

server.registerTool(
  "list_rules",
  {
    title: "List UI authoring rules",
    description:
      "The YAML document shape (page + widgets), layout and sizing rules, the display-only constraints, the element list, and the per-document widget cap.",
    inputSchema: {},
  },
  async () => json(handleListRules()),
);

server.registerTool(
  "validate_ui",
  {
    title: "Validate a UI document",
    description:
      "Validate an agent-authored UI YAML document. Returns {ok:true, summary} when it will render, or {ok:false, errors} with precise, fixable messages (code + path + line). Iterate until ok, then emit the YAML on the run stream.",
    inputSchema: {
      yaml_text: z.string().describe("The full UI document as YAML text."),
    },
  },
  async ({ yaml_text }) => json(handleValidateUi(yaml_text)),
);

// Resources: let capable clients pull the rules / element list directly.
server.registerResource(
  "rules",
  "uigen://rules",
  {
    title: "UI authoring rules",
    description: "The envelope, layout, sizing rules and constraints as JSON.",
    mimeType: "application/json",
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(listRules(), null, 2),
      },
    ],
  }),
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr is safe; stdout is the MCP transport.
  process.stderr.write("ui-generator MCP server running on stdio\n");
}

main().catch((err) => {
  process.stderr.write(`fatal: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});

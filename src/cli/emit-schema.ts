import { zodToJsonSchema } from "zod-to-json-schema";
import { ConfigSchema } from "../schema/index.js";

export function emitSchema(): string {
  const json = zodToJsonSchema(ConfigSchema, {
    name: "AgentUIConfig",
    $refStrategy: "none",
  });
  return JSON.stringify(json, null, 2);
}

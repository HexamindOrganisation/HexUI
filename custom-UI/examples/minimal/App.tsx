import { AgentUI, type ActionDispatcher, type AgentBridge } from "../../src";
import "../../src/styles.css";
import "../../src/shadcn.css";
import configText from "./config.yaml?raw";

const dispatcher: ActionDispatcher = {
  async invoke(action, args) {
    console.log("[action]", action, args);
    switch (action) {
      case "refresh_data":
      case "open_settings":
      case "delete_all":
        alert(action);
        return;
      default:
        return;
    }
  },
  has() {
    return true;
  },
};

let assistantReplies = 0;
const agent: AgentBridge = {
  async onUserSubmit(text) {
    console.log("[user]", text);
    assistantReplies += 1;
    setTimeout(() => {
      lastEmit?.({
        kind: "message",
        messageId: `reply-${assistantReplies}`,
        role: "assistant",
        content: `(echo) ${text}`,
      });
    }, 400);
  },
  subscribeAgentOutput(cb) {
    lastEmit = cb;
    const h = setTimeout(() => {
      cb({
        kind: "message",
        messageId: "greeting",
        role: "assistant",
        content: "Hello from the agent!",
      });
    }, 500);
    return () => {
      clearTimeout(h);
      lastEmit = null;
    };
  },
};

let lastEmit: ((event: Parameters<Parameters<AgentBridge["subscribeAgentOutput"]>[0]>[0]) => void) | null = null;

export default function App(): JSX.Element {
  return (
    <AgentUI
      config={configText}
      dispatcher={dispatcher}
      agent={agent}
      diagnostics="overlay"
    />
  );
}

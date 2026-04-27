import { AgentUI, type ActionDispatcher, type AgentBridge } from "../../src";
import type { FileTreeNode } from "../../src/schema/widgets/file-tree";
import "../../src/styles.css";
import "../../src/shadcn.css";
import configText from "./config.yaml?raw";

const fileTree: FileTreeNode[] = [
  {
    id: "root",
    name: "workspace",
    type: "folder",
    children: [
      {
        id: "docs",
        name: "Documents",
        type: "folder",
        children: [
          { id: "docs/report", name: "report.pdf", type: "file", size: 245_000 },
          { id: "docs/notes", name: "notes.md", type: "file", size: 12_400 },
        ],
      },
      { id: "invoice", name: "invoice.xlsx", type: "file", size: 88_200 },
      { id: "readme", name: "README.md", type: "file", size: 3_200 },
    ],
  },
];

const dispatcher: ActionDispatcher = {
  async invoke(action, args) {
    console.log("[action]", action, args);
    switch (action) {
      case "list_user_files":
        return fileTree;
      case "open_file": {
        const file = (args as { file: { name: string } }).file;
        alert(`Open ${file.name}`);
        return;
      }
      case "delete_file":
        return;
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

const agent: AgentBridge = {
  async onUserSubmit(text) {
    console.log("[user]", text);
  },
  subscribeAgentOutput(cb) {
    const h = setTimeout(() => {
      cb({
        kind: "message",
        role: "assistant",
        content: "Hello from the agent!",
      });
    }, 500);
    return () => clearTimeout(h);
  },
};

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

import { z } from "zod";
import { WidgetBaseShape } from "../widget-base.js";
import { ActionSchema, DataSourceSchema, IconSchema } from "../common.js";

export interface FileTreeNode {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: number;
  children?: FileTreeNode[];
}

export const FileTreeNodeSchema: z.ZodType<FileTreeNode> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(["file", "folder"]),
    size: z.number().nonnegative().optional(),
    children: z.array(FileTreeNodeSchema).optional(),
  }),
);

export const FileTreeActionSchema = z.object({
  name: z.string().min(1),
  action: ActionSchema,
  icon: IconSchema.optional(),
});

export const FileTreeWidgetSchema = z.object({
  ...WidgetBaseShape,
  type: z.literal("file-tree"),
  data_source: DataSourceSchema.optional(),
  nodes: z.array(FileTreeNodeSchema).optional(),
  on_select: ActionSchema.optional(),
  file_actions: z.array(FileTreeActionSchema).optional(),
  empty_text: z.string().optional(),
});

export type FileTreeAction = z.infer<typeof FileTreeActionSchema>;
export type FileTreeWidget = z.infer<typeof FileTreeWidgetSchema>;

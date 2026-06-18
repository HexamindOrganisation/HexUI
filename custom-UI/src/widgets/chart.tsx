import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { WidgetProps } from "../registry/types.js";
import type { ChartWidget, ChartSeries } from "../schema/widgets/chart.js";
import { useWidgetData } from "../runtime/context.js";

type Row = Record<string, unknown>;

/**
 * Default categorical palette. The first slot is the page accent (so a
 * single-series chart matches the agent's color); the rest are tuned to read
 * well in both light and dark mode.
 */
const PALETTE = [
  "hsl(var(--primary))",
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#a855f7",
  "#ef4444",
];

function colorFor(series: ChartSeries, i: number): string {
  return series.color ?? PALETTE[i % PALETTE.length]!;
}

export function ChartWidgetComponent({
  props,
}: WidgetProps<ChartWidget>): JSX.Element {
  const { data, loading, error } = useWidgetData<Row[]>(props.data_source);

  const rows = useMemo<Row[]>(() => {
    if (props.data_source) return Array.isArray(data) ? data : [];
    return Array.isArray(props.data) ? (props.data as Row[]) : [];
  }, [props.data_source, props.data, data]);

  if (props.data_source && error) {
    return (
      <Wrap title={props.title}>
        <div className="text-sm italic text-destructive">
          Failed to load chart: {error.message}
        </div>
      </Wrap>
    );
  }
  if (props.data_source && loading && rows.length === 0) {
    return (
      <Wrap title={props.title}>
        <div className="text-sm italic text-muted-foreground">
          {props.loading_text ?? "Loading chart…"}
        </div>
      </Wrap>
    );
  }
  if (rows.length === 0) {
    return (
      <Wrap title={props.title}>
        <div className="text-sm italic text-muted-foreground">
          {props.empty_text ?? "No data."}
        </div>
      </Wrap>
    );
  }

  const showLegend = props.show_legend ?? props.series.length > 1;
  const showGrid = props.show_grid ?? true;

  return (
    <Wrap title={props.title}>
      <ResponsiveContainer width="100%" height="100%">
        {renderChart(props, rows, showLegend, showGrid)}
      </ResponsiveContainer>
    </Wrap>
  );
}

function renderChart(
  props: ChartWidget,
  rows: Row[],
  showLegend: boolean,
  showGrid: boolean,
): JSX.Element {
  const axisProps = {
    tick: { fontSize: 12, fill: "hsl(var(--muted-foreground))" },
    stroke: "hsl(var(--border))",
  };
  const grid = showGrid ? (
    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
  ) : null;
  const legend = showLegend ? <Legend /> : null;
  const tooltip = (
    <Tooltip
      contentStyle={{
        background: "hsl(var(--popover))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "var(--radius)",
        color: "hsl(var(--popover-foreground))",
        fontSize: 12,
      }}
    />
  );

  switch (props.chart_type) {
    case "bar":
      return (
        <BarChart data={rows}>
          {grid}
          <XAxis dataKey={props.x_key} {...axisProps} />
          <YAxis {...axisProps} />
          {tooltip}
          {legend}
          {props.series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label ?? s.key}
              fill={colorFor(s, i)}
              stackId={props.stacked ? "stack" : undefined}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      );
    case "line":
      return (
        <LineChart data={rows}>
          {grid}
          <XAxis dataKey={props.x_key} {...axisProps} />
          <YAxis {...axisProps} />
          {tooltip}
          {legend}
          {props.series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label ?? s.key}
              stroke={colorFor(s, i)}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      );
    case "area":
      return (
        <AreaChart data={rows}>
          {grid}
          <XAxis dataKey={props.x_key} {...axisProps} />
          <YAxis {...axisProps} />
          {tooltip}
          {legend}
          {props.series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label ?? s.key}
              stroke={colorFor(s, i)}
              fill={colorFor(s, i)}
              fillOpacity={0.2}
              stackId={props.stacked ? "stack" : undefined}
            />
          ))}
        </AreaChart>
      );
    case "scatter":
      return (
        <ScatterChart>
          {grid}
          <XAxis dataKey={props.x_key} {...axisProps} />
          <YAxis dataKey={props.series[0]!.key} {...axisProps} />
          <ZAxis range={[60, 60]} />
          {tooltip}
          {legend}
          {props.series.map((s, i) => (
            <Scatter
              key={s.key}
              data={rows}
              dataKey={s.key}
              name={s.label ?? s.key}
              fill={colorFor(s, i)}
            />
          ))}
        </ScatterChart>
      );
    case "pie": {
      const valueKey = props.series[0]!.key;
      return (
        <PieChart>
          {tooltip}
          {legend}
          <Pie
            data={rows}
            dataKey={valueKey}
            nameKey={props.x_key}
            cx="50%"
            cy="50%"
            outerRadius="80%"
            label
          >
            {rows.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]!} />
            ))}
          </Pie>
        </PieChart>
      );
    }
  }
}

function Wrap({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {title && (
        <div className="mb-2 text-sm font-medium text-foreground">{title}</div>
      )}
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

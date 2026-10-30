"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type Series = {
  key: string;
  label: string;
  color: "series-1" | "series-2";
};

const axis = { fontSize: 11, fill: "var(--fg-subtle)" };

// Recharts injects active/payload/label when this is used as `content`.
type TooltipInput = {
  active?: boolean;
  payload?: readonly { dataKey?: unknown; value?: unknown }[];
  label?: unknown;
};

function ChartTooltip({
  active,
  payload,
  label,
  series,
  formatLabel,
}: TooltipInput & {
  series: Series[];
  formatLabel?: (v: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>
        {formatLabel ? formatLabel(String(label)) : String(label)}
      </strong>
      {series.map((s) => {
        const value = Number(
          payload.find((p) => p.dataKey === s.key)?.value ?? 0,
        );
        return (
          <span key={s.key} className="row" style={{ gap: 6 }}>
            <span
              className="swatch"
              style={{ background: `var(--${s.color})` }}
            />
            {s.label}
            <b style={{ marginLeft: "auto" }}>{value}</b>
          </span>
        );
      })}
    </div>
  );
}

// Identity is never colour alone: two or more series always get a legend.
function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null;
  return (
    <div className="chart-legend">
      {series.map((s) => (
        <span key={s.key}>
          <span
            className="swatch"
            style={{ background: `var(--${s.color})` }}
          />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function DataTable<T extends Record<string, string | number | null>>({
  rows,
  columns,
}: {
  rows: T[];
  columns: {
    key: keyof T;
    label: string;
    format?: (v: T[keyof T]) => string;
  }[];
}) {
  return (
    <details className="chart-table">
      <summary>Tablo olarak göster</summary>
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={String(c.key)}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={String(c.key)}>
                  {c.format ? c.format(r[c.key]) : String(r[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

// Server components cannot pass functions to client components, so axis
// formatting is chosen by name.
const xFormats = {
  week: (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }),
};

export function ColumnChart<T extends Record<string, string | number | null>>({
  data,
  xKey,
  series,
  xFormat,
  xLabel,
  height = 220,
}: {
  data: T[];
  xKey: keyof T & string;
  series: Series[];
  xFormat?: keyof typeof xFormats;
  xLabel: string;
  height?: number;
}) {
  const formatX = xFormat ? xFormats[xFormat] : undefined;
  return (
    <figure className="chart">
      <Legend series={series} />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barGap={2}
            barCategoryGap="28%"
            margin={{ top: 8, right: 4, bottom: 0, left: -18 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey={xKey as string}
              tick={axis}
              tickLine={false}
              axisLine={{ stroke: "var(--border-strong)" }}
              tickFormatter={formatX}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis
              tick={axis}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={44}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              content={<ChartTooltip series={series} formatLabel={formatX} />}
            />
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={`var(--${s.color})`}
                maxBarSize={24}
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable
        rows={data}
        columns={[
          {
            key: xKey,
            label: xLabel,
            format: (v) => (formatX ? formatX(String(v)) : String(v)),
          },
          ...series.map((s) => ({ key: s.key as keyof T, label: s.label })),
        ]}
      />
    </figure>
  );
}

export function BarList<T extends Record<string, string | number | null>>({
  data,
  labelKey,
  series,
  labelHeader,
}: {
  data: T[];
  labelKey: keyof T & string;
  series: Series;
  labelHeader: string;
}) {
  return (
    <figure className="chart">
      <div style={{ height: Math.max(80, data.length * 36 + 24) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            barCategoryGap={8}
            margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis
              type="number"
              tick={axis}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey={labelKey as string}
              tick={{ ...axis, fill: "var(--fg-muted)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border-strong)" }}
              width={110}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              content={<ChartTooltip series={[series]} />}
            />
            <Bar
              dataKey={series.key}
              name={series.label}
              fill={`var(--${series.color})`}
              maxBarSize={20}
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
              label={{
                position: "right",
                fontSize: 11,
                fill: "var(--fg-muted)",
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable
        rows={data}
        columns={[
          { key: labelKey, label: labelHeader },
          { key: series.key as keyof T, label: series.label },
        ]}
      />
    </figure>
  );
}

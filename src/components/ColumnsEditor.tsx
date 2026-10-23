import React, { useState } from 'react';
import { StandardEditorProps } from '@grafana/data';
import { Button, Combobox, Field, Input, Switch, TextArea } from '@grafana/ui';
import {
  ColumnItemKind,
  NumberFormatStyle,
  PieChartType,
  PieDisplayLabel,
  PieSliceConfig,
  PieSliceSort,
  StatCalculation,
  StatColorMode,
  StatColumnItem,
  StatsColumnDefinition,
  StatsColumnOptions,
  StatThreshold,
  StatValueMapping,
  ThresholdOperator,
  ViewportVisibility,
  VisibilityOperator,
  VisibilityRule,
} from '../types';
import { columnTemplates } from '../utils';

const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

const newStatItem = (): StatColumnItem => ({
  id: makeId('stat'),
  kind: 'stat',
  title: 'New Stat',
  field: '',
  unit: '',
  baseColor: 'green',
  thresholds: [],
  valueMappings: [],
});

const newHeadingItem = (): StatColumnItem => ({
  id: makeId('heading'),
  kind: 'heading',
  title: 'Section Heading',
  headingAlign: 'center',
  headingSize: 'lg',
});

const newPieItem = (): StatColumnItem => ({
  id: makeId('pie'),
  kind: 'pie',
  title: '',
  unit: 'kWh',
  decimals: 0,
  pieType: 'pie',
  pieDisplayLabels: 'percent',
  pieSort: 'desc',
  pieShowLegend: true,
  minHeight: 272,
  pieSlices: [],
});

const newColumn = (index: number): StatsColumnDefinition => ({
  id: makeId('col'),
  title: `Column ${index + 1}`,
  titleAlign: 'center',
  items: [newStatItem()],
});

const cloneColumns = (cols: StatsColumnDefinition[]) =>
  JSON.parse(JSON.stringify(cols)) as StatsColumnDefinition[];

const move = <T,>(items: T[], from: number, to: number): T[] => {
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
};

const colorOptions = [
  { label: 'Green', value: 'green' },
  { label: 'Super Light Blue', value: 'super-light-blue' },
  { label: 'Light Blue', value: 'light-blue' },
  { label: 'Blue', value: 'blue' },
  { label: 'Yellow', value: 'yellow' },
  { label: 'Orange', value: 'orange' },
  { label: 'Red', value: 'red' },
  { label: 'Dark Red', value: 'dark-red' },
  { label: 'Purple', value: 'purple' },
  { label: 'White / Primary', value: 'white' },
  { label: 'Gray / Muted', value: 'gray' },
];

const viewportVisibilityOptions: Array<{ label: string; value: ViewportVisibility }> = [
  { label: 'All screens (Desktop & Mobile)', value: 'all' },
  { label: 'Desktop only (Hide when stacked on mobile)', value: 'desktopOnly' },
  { label: 'Mobile only (Show only when stacked)', value: 'mobileOnly' },
];

const calculationOptions: Array<{ label: string; value: StatCalculation }> = [
  { label: 'Last (not null)', value: 'lastNotNull' },
  { label: 'Last', value: 'last' },
  { label: 'First (not null)', value: 'firstNotNull' },
  { label: 'First', value: 'first' },
  { label: 'Min', value: 'min' },
  { label: 'Max', value: 'max' },
  { label: 'Mean (Average)', value: 'mean' },
  { label: 'Sum (Total)', value: 'sum' },
  { label: 'Count', value: 'count' },
  { label: 'Selected row (Selector / Index)', value: 'rowSelector' },
];

const numberFormatOptions: Array<{ label: string; value: 'inherit' | NumberFormatStyle }> = [
  { label: 'Inherit panel default', value: 'inherit' },
  { label: 'German grouped (10.000,56 / 5,62)', value: 'de-grouped' },
  { label: 'English grouped (10,000.56 / 5.62)', value: 'en-grouped' },
  { label: 'Plain dot (10000.56 / 5.62)', value: 'en-plain' },
  { label: 'Plain comma (10000,56 / 5,62)', value: 'de-plain' },
];

const colorModeOptions: Array<{ label: string; value: 'inherit' | StatColorMode }> = [
  { label: 'Inherit panel default', value: 'inherit' },
  { label: 'Value text color', value: 'value' },
  { label: 'Solid background color', value: 'background' },
  { label: 'Gradient background color', value: 'background-gradient' },
  { label: 'Neutral (no color)', value: 'none' },
];

const thresholdOperatorOptions: Array<{ label: string; value: ThresholdOperator }> = [
  { label: '>= (Greater or equal)', value: 'gte' },
  { label: '> (Greater than)', value: 'gt' },
  { label: '<= (Less or equal)', value: 'lte' },
  { label: '< (Less than)', value: 'lt' },
  { label: '= (Equals)', value: 'equals' },
];

const visibilityOperatorOptions: Array<{ label: string; value: VisibilityOperator }> = [
  { label: 'Equals (=)', value: 'equals' },
  { label: 'Not equals (!=)', value: 'notEquals' },
  { label: 'Contains', value: 'contains' },
  { label: 'Does not contain', value: 'notContains' },
  { label: 'Greater than (>)', value: 'gt' },
  { label: 'Greater or equal (>=)', value: 'gte' },
  { label: 'Less than (<)', value: 'lt' },
  { label: 'Less or equal (<=)', value: 'lte' },
  { label: 'Is not empty', value: 'notEmpty' },
  { label: 'Is empty', value: 'empty' },
  { label: 'Matches regex', value: 'regex' },
];

const defaultVisibilityRule = (): VisibilityRule => ({
  enabled: false,
  source: 'variable',
  target: '',
  operator: 'equals',
  value: '',
});

interface VisibilityEditorProps {
  label: string;
  rule?: VisibilityRule;
  onChange: (next: VisibilityRule) => void;
}

const VisibilityRuleEditor = ({ label, rule, onChange }: VisibilityEditorProps) => {
  const current = rule ?? defaultVisibilityRule();
  const patch = (updates: Partial<VisibilityRule>) => onChange({ ...current, ...updates });

  return (
    <div style={{ border: '1px dashed rgba(204, 204, 220, 0.25)', borderRadius: 4, padding: 8, marginTop: 6, marginBottom: 8 }}>
      <Field label={label} description="Conditionally show or hide based on a Grafana variable or query field.">
        <Switch value={current.enabled ?? false} onChange={(e) => patch({ enabled: e.currentTarget.checked })} />
      </Field>
      {current.enabled && (
        <>
          <Field label="Condition source">
            <Combobox
              options={[
                { label: 'Dashboard Variable ($var)', value: 'variable' },
                { label: 'Query Field value', value: 'field' },
              ]}
              value={current.source}
              onChange={(selected) => patch({ source: (selected?.value as 'variable' | 'field') ?? 'variable' })}
            />
          </Field>
          <Field
            label={current.source === 'variable' ? 'Variable name' : 'Field name'}
            description={current.source === 'variable' ? 'Example: $view_mode or device_type' : 'Field name in query data'}
          >
            <Input
              value={current.target}
              placeholder={current.source === 'variable' ? '$view_mode' : 'status'}
              onChange={(e) => patch({ target: e.currentTarget.value })}
            />
          </Field>
          <Field label="Operator">
            <Combobox
              options={visibilityOperatorOptions}
              value={current.operator}
              onChange={(selected) => patch({ operator: (selected?.value as VisibilityOperator) ?? 'equals' })}
            />
          </Field>
          {current.operator !== 'empty' && current.operator !== 'notEmpty' && (
            <Field label="Expected value" description="Supports dashboard variables.">
              <Input
                value={current.value ?? ''}
                placeholder="compact"
                onChange={(e) => patch({ value: e.currentTarget.value })}
              />
            </Field>
          )}
        </>
      )}
    </div>
  );
};

export const ColumnsEditor = ({
  value = [],
  onChange,
  context,
}: StandardEditorProps<StatsColumnDefinition[], undefined, StatsColumnOptions>) => {
  const [collapsedCols, setCollapsedCols] = useState<Record<number, boolean>>({});
  const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>({});
  const [jsonText, setJsonText] = useState('');
  const [showJsonTools, setShowJsonTools] = useState(false);

  const allFields = Array.from(
    new Set(context.data.flatMap((frame) => frame.fields.map((field) => field.name)))
  ).map((name) => ({ label: name, value: name }));

  const frameRefOptions = Array.from(
    new Set(context.data.map((frame) => frame.refId || frame.name).filter(Boolean) as string[])
  ).map((ref) => ({ label: `Query ${ref}`, value: ref }));

  const updateColumn = (colIndex: number, patch: Partial<StatsColumnDefinition>) => {
    onChange(value.map((col, idx) => (idx === colIndex ? { ...col, ...patch } : col)));
  };

  const updateItem = (colIndex: number, itemIndex: number, patch: Partial<StatColumnItem>) => {
    const items = value[colIndex].items ?? [];
    updateColumn(colIndex, {
      items: items.map((item, idx) => (idx === itemIndex ? { ...item, ...patch } : item)),
    });
  };

  const updateThreshold = (
    colIndex: number,
    itemIndex: number,
    thresholdIndex: number,
    patch: Partial<StatThreshold>
  ) => {
    const current = value[colIndex].items[itemIndex].thresholds ?? [];
    updateItem(colIndex, itemIndex, {
      thresholds: current.map((step, idx) => (idx === thresholdIndex ? { ...step, ...patch } : step)),
    });
  };

  const updateMapping = (
    colIndex: number,
    itemIndex: number,
    mappingIndex: number,
    patch: Partial<StatValueMapping>
  ) => {
    const current = value[colIndex].items[itemIndex].valueMappings ?? [];
    updateItem(colIndex, itemIndex, {
      valueMappings: current.map((m, idx) => (idx === mappingIndex ? { ...m, ...patch } : m)),
    });
  };

  const updatePieSlice = (
    colIndex: number,
    itemIndex: number,
    sliceIndex: number,
    patch: Partial<PieSliceConfig>
  ) => {
    const current = value[colIndex].items[itemIndex].pieSlices ?? [];
    updateItem(colIndex, itemIndex, {
      pieSlices: current.map((s, idx) => (idx === sliceIndex ? { ...s, ...patch } : s)),
    });
  };

  const importJson = () => {
    try {
      const parsed = JSON.parse(jsonText) as StatsColumnDefinition[];
      if (!Array.isArray(parsed)) {
        throw new Error('Expected a JSON array of column definitions.');
      }
      onChange(parsed);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      <Field label="Starter template" description="Load a preset column layout.">
        <Combobox
          isClearable
          options={[
            { label: 'Telemetry Overview (2 columns + Pie chart + headings)', value: 'telemetryOverview' },
            { label: '3-Column Infrastructure Overview', value: 'threeColumns' },
          ]}
          onChange={(selected) => {
            if (selected?.value && columnTemplates[selected.value]) {
              onChange(cloneColumns(columnTemplates[selected.value]));
            }
          }}
        />
      </Field>

      <div style={{ marginBottom: 12 }}>
        <Button size="sm" variant="secondary" onClick={() => setShowJsonTools((prev) => !prev)}>
          {showJsonTools ? 'Hide JSON import/export' : 'JSON import/export'}
        </Button>
        {showJsonTools && (
          <div style={{ marginTop: 8 }}>
            <TextArea
              rows={5}
              value={jsonText}
              placeholder="Paste columns JSON here"
              onChange={(e) => setJsonText(e.currentTarget.value)}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <Button size="sm" variant="secondary" onClick={() => setJsonText(JSON.stringify(value, null, 2))}>
                Export current
              </Button>
              <Button size="sm" variant="secondary" onClick={importJson}>
                Import JSON
              </Button>
            </div>
          </div>
        )}
      </div>

      {value.map((col, colIndex) => {
        const isColCollapsed = collapsedCols[colIndex] ?? false;
        return (
          <div
            key={col.id || colIndex}
            style={{
              border: '1px solid rgba(204, 204, 220, 0.25)',
              borderRadius: 6,
              marginBottom: 14,
              padding: 10,
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <strong>
                Column {colIndex + 1}
                {col.title ? `: ${col.title}` : ''} ({col.items.length} item{col.items.length === 1 ? '' : 's'})
              </strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCollapsedCols((curr) => ({ ...curr, [colIndex]: !isColCollapsed }))}
                >
                  {isColCollapsed ? 'Expand' : 'Collapse'}
                </Button>
                <Button
                  aria-label="Duplicate column"
                  size="sm"
                  variant="secondary"
                  icon="copy"
                  title="Duplicate column"
                  onClick={() => {
                    const copy = cloneColumns([col])[0];
                    copy.id = makeId('col');
                    onChange([...value.slice(0, colIndex + 1), copy, ...value.slice(colIndex + 1)]);
                  }}
                />
                <Button
                  aria-label="Move column up"
                  size="sm"
                  variant="secondary"
                  icon="arrow-up"
                  title="Move column left/up"
                  disabled={colIndex === 0}
                  onClick={() => onChange(move(value, colIndex, colIndex - 1))}
                />
                <Button
                  aria-label="Move column down"
                  size="sm"
                  variant="secondary"
                  icon="arrow-down"
                  title="Move column right/down"
                  disabled={colIndex === value.length - 1}
                  onClick={() => onChange(move(value, colIndex, colIndex + 1))}
                />
                <Button
                  aria-label="Remove column"
                  size="sm"
                  variant="destructive"
                  icon="trash-alt"
                  title="Remove column"
                  onClick={() => onChange(value.filter((_, idx) => idx !== colIndex))}
                />
              </div>
            </div>

            {!isColCollapsed && (
              <>
                <Field label="Column top heading (optional)" description="Shown at the top of this column. Leave empty if headings are placed inline.">
                  <Input
                    value={col.title ?? ''}
                    placeholder="e.g. Node Telemetry or Cluster Summary"
                    onChange={(e) => updateColumn(colIndex, { title: e.currentTarget.value })}
                  />
                </Field>
                {col.title?.trim() && (
                  <Field label="Column heading alignment">
                    <Combobox
                      options={[
                        { label: 'Center', value: 'center' },
                        { label: 'Left', value: 'left' },
                        { label: 'Right', value: 'right' },
                      ]}
                      value={col.titleAlign || 'center'}
                      onChange={(selected) =>
                        updateColumn(colIndex, { titleAlign: (selected?.value as 'left' | 'center' | 'right') || 'center' })
                      }
                    />
                  </Field>
                )}

                <Field label="Column width ratio (Desktop)" description="Relative width compared to other columns (e.g. 1 = equal, 1.5 = 50% wider).">
                  <Input
                    type="number"
                    step="0.1"
                    value={col.widthWeight ?? 1}
                    onChange={(e) =>
                      updateColumn(colIndex, {
                        widthWeight: e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value),
                      })
                    }
                  />
                </Field>

                <Field label="Column screen visibility">
                  <Combobox
                    options={viewportVisibilityOptions}
                    value={col.viewportVisibility || 'all'}
                    onChange={(sel) =>
                      updateColumn(colIndex, { viewportVisibility: (sel?.value as ViewportVisibility) || 'all' })
                    }
                  />
                </Field>

                <VisibilityRuleEditor
                  label="Column conditional visibility"
                  rule={col.visibility}
                  onChange={(nextRule) => updateColumn(colIndex, { visibility: nextRule })}
                />

                {col.items.map((item, itemIndex) => {
                  const itemKey = `${colIndex}-${item.id || itemIndex}`;
                  const isItemCollapsed = collapsedItems[itemKey] ?? false;
                  const borderColor =
                    item.kind === 'heading' ? '#5794F2' : item.kind === 'pie' ? '#B877D9' : '#73BF69';
                  const badgeLabel =
                    item.kind === 'heading' ? 'Heading' : item.kind === 'pie' ? 'Pie Chart' : 'Stat';

                  return (
                    <div
                      key={item.id || itemIndex}
                      style={{
                        borderLeft: `3px solid ${borderColor}`,
                        background: 'rgba(204, 204, 220, 0.04)',
                        borderRadius: 4,
                        margin: '8px 0',
                        padding: 8,
                      }}
                    >
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>
                          [{badgeLabel}] {item.title || item.field || `#${itemIndex + 1}`}
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setCollapsedItems((curr) => ({ ...curr, [itemKey]: !isItemCollapsed }))}
                          >
                            {isItemCollapsed ? 'Edit' : 'Hide'}
                          </Button>
                          <Button
                            aria-label="Duplicate item"
                            size="sm"
                            variant="secondary"
                            icon="copy"
                            title="Duplicate item"
                            onClick={() => {
                              const copy = JSON.parse(JSON.stringify(item)) as StatColumnItem;
                              copy.id = makeId(item.kind);
                              updateColumn(colIndex, {
                                items: [...col.items.slice(0, itemIndex + 1), copy, ...col.items.slice(itemIndex + 1)],
                              });
                            }}
                          />
                          <Button
                            aria-label="Move item up"
                            size="sm"
                            variant="secondary"
                            icon="arrow-up"
                            disabled={itemIndex === 0}
                            onClick={() => updateColumn(colIndex, { items: move(col.items, itemIndex, itemIndex - 1) })}
                          />
                          <Button
                            aria-label="Move item down"
                            size="sm"
                            variant="secondary"
                            icon="arrow-down"
                            disabled={itemIndex === col.items.length - 1}
                            onClick={() => updateColumn(colIndex, { items: move(col.items, itemIndex, itemIndex + 1) })}
                          />
                          <Button
                            aria-label="Remove item"
                            size="sm"
                            variant="secondary"
                            icon="trash-alt"
                            onClick={() =>
                              updateColumn(colIndex, { items: col.items.filter((_, idx) => idx !== itemIndex) })
                            }
                          />
                        </div>
                      </div>

                      {!isItemCollapsed && (
                        <>
                          <Field label="Item type">
                            <Combobox
                              options={[
                                { label: 'Stat box', value: 'stat' },
                                { label: 'Pie / Donut chart', value: 'pie' },
                                { label: 'Section heading', value: 'heading' },
                              ]}
                              value={item.kind}
                              onChange={(selected) =>
                                updateItem(colIndex, itemIndex, { kind: (selected?.value as ColumnItemKind) || 'stat' })
                              }
                            />
                          </Field>

                          <Field
                            label={
                              item.kind === 'heading'
                                ? 'Heading text'
                                : item.kind === 'pie'
                                  ? 'Pie chart title (optional)'
                                  : 'Stat title'
                            }
                          >
                            <Input
                              value={item.title}
                              onChange={(e) => updateItem(colIndex, itemIndex, { title: e.currentTarget.value })}
                            />
                          </Field>

                          {item.kind === 'heading' ? (
                            <>
                              <Field label="Heading alignment">
                                <Combobox
                                  options={[
                                    { label: 'Center', value: 'center' },
                                    { label: 'Left', value: 'left' },
                                    { label: 'Right', value: 'right' },
                                  ]}
                                  value={item.headingAlign || 'center'}
                                  onChange={(selected) =>
                                    updateItem(colIndex, itemIndex, {
                                      headingAlign: (selected?.value as 'left' | 'center' | 'right') || 'center',
                                    })
                                  }
                                />
                              </Field>
                              <Field label="Heading size">
                                <Combobox
                                  options={[
                                    { label: 'Large', value: 'lg' },
                                    { label: 'Medium', value: 'md' },
                                    { label: 'Small', value: 'sm' },
                                  ]}
                                  value={item.headingSize || 'lg'}
                                  onChange={(selected) =>
                                    updateItem(colIndex, itemIndex, {
                                      headingSize: (selected?.value as 'sm' | 'md' | 'lg') || 'lg',
                                    })
                                  }
                                />
                              </Field>
                            </>
                          ) : item.kind === 'pie' ? (
                            <>
                              <Field label="Info tooltip (optional)">
                                <Input
                                  value={item.tooltip ?? ''}
                                  placeholder="e.g. Energy distribution across cluster nodes"
                                  onChange={(e) => updateItem(colIndex, itemIndex, { tooltip: e.currentTarget.value })}
                                />
                              </Field>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <Field label="Chart style">
                                  <Combobox
                                    options={[
                                      { label: 'Pie', value: 'pie' },
                                      { label: 'Donut', value: 'donut' },
                                    ]}
                                    value={item.pieType || 'pie'}
                                    onChange={(sel) =>
                                      updateItem(colIndex, itemIndex, { pieType: (sel?.value as PieChartType) || 'pie' })
                                    }
                                  />
                                </Field>

                                <Field label="Slice labels">
                                  <Combobox
                                    options={[
                                      { label: 'Percentage (41%)', value: 'percent' },
                                      { label: 'Value (1450 kWh)', value: 'value' },
                                      { label: 'Slice name', value: 'name' },
                                      { label: 'None', value: 'none' },
                                    ]}
                                    value={item.pieDisplayLabels || 'percent'}
                                    onChange={(sel) =>
                                      updateItem(colIndex, itemIndex, {
                                        pieDisplayLabels: (sel?.value as PieDisplayLabel) || 'percent',
                                      })
                                    }
                                  />
                                </Field>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <Field label="Slice sort order">
                                  <Combobox
                                    options={[
                                      { label: 'Descending (Largest first)', value: 'desc' },
                                      { label: 'Ascending (Smallest first)', value: 'asc' },
                                      { label: 'Configured order', value: 'none' },
                                    ]}
                                    value={item.pieSort || 'desc'}
                                    onChange={(sel) =>
                                      updateItem(colIndex, itemIndex, { pieSort: (sel?.value as PieSliceSort) || 'desc' })
                                    }
                                  />
                                </Field>

                                <Field label="Card min height (px)">
                                  <Input
                                    type="number"
                                    value={item.minHeight ?? 272}
                                    onChange={(e) =>
                                      updateItem(colIndex, itemIndex, {
                                        minHeight: e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value),
                                      })
                                    }
                                  />
                                </Field>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <Field label="Tooltip unit">
                                  <Input
                                    value={item.unit ?? 'kWh'}
                                    placeholder="kWh"
                                    onChange={(e) => updateItem(colIndex, itemIndex, { unit: e.currentTarget.value })}
                                  />
                                </Field>

                                <Field label="Show bottom legend">
                                  <Switch
                                    value={item.pieShowLegend ?? true}
                                    onChange={(e) =>
                                      updateItem(colIndex, itemIndex, { pieShowLegend: e.currentTarget.checked })
                                    }
                                  />
                                </Field>
                              </div>

                              <Field
                                label="Default Query refId (when no slices configured below)"
                                description="If no slices are added below, all numeric fields in this query (or all queries) become slices automatically."
                              >
                                <Combobox
                                  isClearable
                                  options={Array.from(
                                    new Set([...frameRefOptions.map((r) => r.value), item.refId].filter(Boolean) as string[])
                                  ).map((ref) => ({ label: `Query ${ref}`, value: ref }))}
                                  value={item.refId ?? ''}
                                  onChange={(selected) => updateItem(colIndex, itemIndex, { refId: selected?.value ?? '' })}
                                />
                              </Field>

                              <div style={{ marginTop: 8, marginBottom: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                                  Pie Slices ({(item.pieSlices ?? []).length})
                                </div>
                                {(item.pieSlices ?? []).map((slice, sIdx) => (
                                  <div
                                    key={slice.id || sIdx}
                                    style={{
                                      border: '1px solid rgba(204, 204, 220, 0.2)',
                                      borderRadius: 4,
                                      padding: 6,
                                      marginBottom: 6,
                                    }}
                                  >
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                      <Field label="Slice label" description="Leave blank to use series or field label.">
                                        <Input
                                          value={slice.label ?? ''}
                                          placeholder="e.g. Node-A or Available Capacity"
                                          onChange={(e) =>
                                            updatePieSlice(colIndex, itemIndex, sIdx, { label: e.currentTarget.value })
                                          }
                                        />
                                      </Field>
                                      <Field label="Color">
                                        <Combobox
                                          isClearable
                                          options={colorOptions}
                                          value={slice.color ?? ''}
                                          onChange={(sel) =>
                                            updatePieSlice(colIndex, itemIndex, sIdx, { color: sel?.value ?? '' })
                                          }
                                        />
                                      </Field>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                      <Field label="Query refId (optional)">
                                        <Combobox
                                          isClearable
                                          options={Array.from(
                                            new Set(
                                              [...frameRefOptions.map((r) => r.value), slice.refId].filter(Boolean) as string[]
                                            )
                                          ).map((ref) => ({ label: `Query ${ref}`, value: ref }))}
                                          value={slice.refId ?? ''}
                                          onChange={(sel) =>
                                            updatePieSlice(colIndex, itemIndex, sIdx, { refId: sel?.value ?? '' })
                                          }
                                        />
                                      </Field>
                                      <Field label="Source field (optional)">
                                        <Combobox
                                          isClearable
                                          options={Array.from(
                                            new Set([...allFields.map((f) => f.value), slice.field].filter(Boolean) as string[])
                                          ).map((f) => ({ label: f, value: f }))}
                                          value={slice.field ?? ''}
                                          onChange={(sel) =>
                                            updatePieSlice(colIndex, itemIndex, sIdx, { field: sel?.value ?? '' })
                                          }
                                        />
                                      </Field>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      icon="trash-alt"
                                      onClick={() =>
                                        updateItem(colIndex, itemIndex, {
                                          pieSlices: (item.pieSlices ?? []).filter((_, idx) => idx !== sIdx),
                                        })
                                      }
                                    >
                                      Remove slice
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  icon="plus"
                                  onClick={() =>
                                    updateItem(colIndex, itemIndex, {
                                      pieSlices: [
                                        ...(item.pieSlices ?? []),
                                        {
                                          id: makeId('slice'),
                                          label: '',
                                          field: '',
                                          color: 'purple',
                                        },
                                      ],
                                    })
                                  }
                                >
                                  Add Pie slice
                                </Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <Field label="Info tooltip (optional)" description="Adds an (i) icon next to the title.">
                                <Input
                                  value={item.tooltip ?? ''}
                                  placeholder="Optional explanation shown on hover"
                                  onChange={(e) => updateItem(colIndex, itemIndex, { tooltip: e.currentTarget.value })}
                                />
                              </Field>

                              <Field label="Query refId (optional)" description="Select a specific query (e.g. A, B, C) or leave blank to match by field name.">
                                <Combobox
                                  isClearable
                                  options={Array.from(
                                    new Set([...frameRefOptions.map((r) => r.value), item.refId].filter(Boolean) as string[])
                                  ).map((ref) => ({ label: `Query ${ref}`, value: ref }))}
                                  value={item.refId ?? ''}
                                  onChange={(selected) => updateItem(colIndex, itemIndex, { refId: selected?.value ?? '' })}
                                />
                              </Field>

                              <Field label="Source field" description="Leave blank when Query refId is set to use the first non-time field of that query.">
                                <Combobox
                                  isClearable
                                  options={Array.from(
                                    new Set([...allFields.map((f) => f.value), item.field].filter(Boolean) as string[])
                                  ).map((f) => ({ label: f, value: f }))}
                                  value={item.field ?? ''}
                                  onChange={(selected) => updateItem(colIndex, itemIndex, { field: selected?.value ?? '' })}
                                />
                              </Field>

                              <Field label="Calculation / value reduction">
                                <Combobox
                                  isClearable
                                  placeholder="Inherit panel default"
                                  options={calculationOptions}
                                  value={item.calculation}
                                  onChange={(selected) =>
                                    updateItem(colIndex, itemIndex, {
                                      calculation: selected?.value as StatCalculation | undefined,
                                    })
                                  }
                                />
                              </Field>

                              <Field label="Unit suffix" description="Examples: kWh, kW, V, %, °C">
                                <Input
                                  value={item.unit ?? ''}
                                  placeholder="kWh"
                                  onChange={(e) => updateItem(colIndex, itemIndex, { unit: e.currentTarget.value })}
                                />
                              </Field>

                              <Field label="Decimals">
                                <Input
                                  type="number"
                                  value={item.decimals ?? ''}
                                  placeholder="Auto"
                                  onChange={(e) =>
                                    updateItem(colIndex, itemIndex, {
                                      decimals: e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value),
                                    })
                                  }
                                />
                              </Field>

                              <Field label="Number format override">
                                <Combobox
                                  options={numberFormatOptions}
                                  value={item.numberFormat || 'inherit'}
                                  onChange={(selected) =>
                                    updateItem(colIndex, itemIndex, {
                                      numberFormat: (selected?.value as 'inherit' | NumberFormatStyle) || 'inherit',
                                    })
                                  }
                                />
                              </Field>

                              <Field label="Color mode">
                                <Combobox
                                  options={colorModeOptions}
                                  value={item.colorMode || 'inherit'}
                                  onChange={(selected) =>
                                    updateItem(colIndex, itemIndex, {
                                      colorMode: (selected?.value as 'inherit' | StatColorMode) || 'inherit',
                                    })
                                  }
                                />
                              </Field>

                              <Field label="Base color">
                                <Combobox
                                  options={colorOptions}
                                  value={item.baseColor || 'green'}
                                  onChange={(selected) =>
                                    updateItem(colIndex, itemIndex, { baseColor: selected?.value || 'green' })
                                  }
                                />
                              </Field>

                              <Field label="No-value text">
                                <Input
                                  value={item.noValueText ?? ''}
                                  placeholder="Inherit (-)"
                                  onChange={(e) => updateItem(colIndex, itemIndex, { noValueText: e.currentTarget.value })}
                                />
                              </Field>

                              <div style={{ marginTop: 8, marginBottom: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                                  Thresholds ({(item.thresholds ?? []).length})
                                </div>
                                {(item.thresholds ?? []).map((step, tIdx) => (
                                  <div
                                    key={tIdx}
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: '1fr 1fr 1fr auto',
                                      gap: 6,
                                      alignItems: 'center',
                                      marginBottom: 6,
                                    }}
                                  >
                                    <Combobox
                                      options={thresholdOperatorOptions}
                                      value={step.operator}
                                      onChange={(sel) =>
                                        updateThreshold(colIndex, itemIndex, tIdx, {
                                          operator: (sel?.value as ThresholdOperator) || 'gte',
                                        })
                                      }
                                    />
                                    <Input
                                      value={step.value}
                                      placeholder="Value"
                                      onChange={(e) =>
                                        updateThreshold(colIndex, itemIndex, tIdx, { value: e.currentTarget.value })
                                      }
                                    />
                                    <Combobox
                                      options={colorOptions}
                                      value={step.color}
                                      onChange={(sel) =>
                                        updateThreshold(colIndex, itemIndex, tIdx, { color: sel?.value || 'yellow' })
                                      }
                                    />
                                    <Button
                                      aria-label="Remove threshold"
                                      size="sm"
                                      variant="secondary"
                                      icon="trash-alt"
                                      onClick={() =>
                                        updateItem(colIndex, itemIndex, {
                                          thresholds: (item.thresholds ?? []).filter((_, idx) => idx !== tIdx),
                                        })
                                      }
                                    />
                                  </div>
                                ))}
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  icon="plus"
                                  onClick={() =>
                                    updateItem(colIndex, itemIndex, {
                                      thresholds: [
                                        ...(item.thresholds ?? []),
                                        { operator: 'gte', value: '80', color: 'yellow' },
                                      ],
                                    })
                                  }
                                >
                                  Add threshold
                                </Button>
                              </div>

                              <div style={{ marginTop: 8, marginBottom: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                                  Value Mappings ({(item.valueMappings ?? []).length})
                                </div>
                                {(item.valueMappings ?? []).map((mapping, mIdx) => (
                                  <div
                                    key={mIdx}
                                    style={{
                                      border: '1px solid rgba(204, 204, 220, 0.2)',
                                      borderRadius: 4,
                                      padding: 6,
                                      marginBottom: 6,
                                    }}
                                  >
                                    <Field label="Mapping type">
                                      <Combobox
                                        options={[
                                          { label: 'Exact value', value: 'value' },
                                          { label: 'Numeric range', value: 'range' },
                                          { label: 'Special (null / NaN / empty)', value: 'special' },
                                        ]}
                                        value={mapping.type}
                                        onChange={(sel) =>
                                          updateMapping(colIndex, itemIndex, mIdx, {
                                            type: (sel?.value as 'value' | 'range' | 'special') || 'value',
                                          })
                                        }
                                      />
                                    </Field>
                                    {mapping.type === 'value' && (
                                      <Field label="Match value">
                                        <Input
                                          value={mapping.value ?? ''}
                                          onChange={(e) =>
                                            updateMapping(colIndex, itemIndex, mIdx, { value: e.currentTarget.value })
                                          }
                                        />
                                      </Field>
                                    )}
                                    {mapping.type === 'range' && (
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                        <Field label="From">
                                          <Input
                                            type="number"
                                            value={mapping.from ?? ''}
                                            onChange={(e) =>
                                              updateMapping(colIndex, itemIndex, mIdx, {
                                                from: e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value),
                                              })
                                            }
                                          />
                                        </Field>
                                        <Field label="To">
                                          <Input
                                            type="number"
                                            value={mapping.to ?? ''}
                                            onChange={(e) =>
                                              updateMapping(colIndex, itemIndex, mIdx, {
                                                to: e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value),
                                              })
                                            }
                                          />
                                        </Field>
                                      </div>
                                    )}
                                    {mapping.type === 'special' && (
                                      <Field label="Special match">
                                        <Combobox
                                          options={[
                                            { label: 'Null / undefined', value: 'null' },
                                            { label: 'NaN', value: 'nan' },
                                            { label: 'Empty string', value: 'empty' },
                                          ]}
                                          value={mapping.specialMatch || 'null'}
                                          onChange={(sel) =>
                                            updateMapping(colIndex, itemIndex, mIdx, {
                                              specialMatch: (sel?.value as 'null' | 'nan' | 'empty') || 'null',
                                            })
                                          }
                                        />
                                      </Field>
                                    )}
                                    <Field label="Display text">
                                      <Input
                                        value={mapping.text}
                                        onChange={(e) =>
                                          updateMapping(colIndex, itemIndex, mIdx, { text: e.currentTarget.value })
                                        }
                                      />
                                    </Field>
                                    <Field label="Color override (optional)">
                                      <Combobox
                                        isClearable
                                        options={colorOptions}
                                        value={mapping.color ?? ''}
                                        onChange={(sel) =>
                                          updateMapping(colIndex, itemIndex, mIdx, { color: sel?.value ?? '' })
                                        }
                                      />
                                    </Field>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      icon="trash-alt"
                                      onClick={() =>
                                        updateItem(colIndex, itemIndex, {
                                          valueMappings: (item.valueMappings ?? []).filter((_, idx) => idx !== mIdx),
                                        })
                                      }
                                    >
                                      Remove mapping
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  icon="plus"
                                  onClick={() =>
                                    updateItem(colIndex, itemIndex, {
                                      valueMappings: [
                                        ...(item.valueMappings ?? []),
                                        { type: 'value', value: '0', text: 'Idle', color: 'gray' },
                                      ],
                                    })
                                  }
                                >
                                  Add value mapping
                                </Button>
                              </div>
                            </>
                          )}

                          <div
                            style={{
                              border: '1px solid rgba(204, 204, 220, 0.2)',
                              borderRadius: 4,
                              padding: 8,
                              marginTop: 8,
                              marginBottom: 8,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 600 }}>Size & Dimensions (or drag card edges)</span>
                              {(item.minHeight !== undefined ||
                                item.widthPercent !== undefined ||
                                item.valueFontSize !== undefined ||
                                item.titleFontSize !== undefined ||
                                item.pieSize !== undefined) && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() =>
                                    updateItem(colIndex, itemIndex, {
                                      minHeight: undefined,
                                      widthPercent: undefined,
                                      valueFontSize: undefined,
                                      titleFontSize: undefined,
                                      pieSize: undefined,
                                    })
                                  }
                                >
                                  Reset size
                                </Button>
                              )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                              <Field label="Height (px)" description="Card min height">
                                <Input
                                  type="number"
                                  placeholder="Default"
                                  value={item.minHeight ?? ''}
                                  onChange={(e) =>
                                    updateItem(colIndex, itemIndex, {
                                      minHeight: e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value),
                                    })
                                  }
                                />
                              </Field>
                              <Field label="Width (%)" description="25% to 100% of column">
                                <Input
                                  type="number"
                                  placeholder="100"
                                  value={item.widthPercent ?? ''}
                                  onChange={(e) =>
                                    updateItem(colIndex, itemIndex, {
                                      widthPercent: e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value),
                                    })
                                  }
                                />
                              </Field>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                              {item.kind === 'pie' ? (
                                <Field label="Chart diameter (px)">
                                  <Input
                                    type="number"
                                    placeholder="Auto from height"
                                    value={item.pieSize ?? ''}
                                    onChange={(e) =>
                                      updateItem(colIndex, itemIndex, {
                                        pieSize: e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value),
                                      })
                                    }
                                  />
                                </Field>
                              ) : (
                                <Field label={item.kind === 'heading' ? 'Heading font (px)' : 'Value font (px)'}>
                                  <Input
                                    type="number"
                                    placeholder="Default"
                                    value={item.valueFontSize ?? ''}
                                    onChange={(e) =>
                                      updateItem(colIndex, itemIndex, {
                                        valueFontSize: e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value),
                                      })
                                    }
                                  />
                                </Field>
                              )}

                              {item.kind !== 'heading' && (
                                <Field label="Title font (px)">
                                  <Input
                                    type="number"
                                    placeholder="Default"
                                    value={item.titleFontSize ?? ''}
                                    onChange={(e) =>
                                      updateItem(colIndex, itemIndex, {
                                        titleFontSize: e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value),
                                      })
                                    }
                                  />
                                </Field>
                              )}
                            </div>
                          </div>

                          <Field label="Screen visibility" description="Control whether this item appears on desktop, mobile, or both.">
                            <Combobox
                              options={viewportVisibilityOptions}
                              value={item.viewportVisibility || 'all'}
                              onChange={(sel) =>
                                updateItem(colIndex, itemIndex, {
                                  viewportVisibility: (sel?.value as ViewportVisibility) || 'all',
                                })
                              }
                            />
                          </Field>

                          <VisibilityRuleEditor
                            label="Item conditional visibility"
                            rule={item.visibility}
                            onChange={(nextRule) => updateItem(colIndex, itemIndex, { visibility: nextRule })}
                          />
                        </>
                      )}
                    </div>
                  );
                })}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="plus"
                    onClick={() => updateColumn(colIndex, { items: [...col.items, newStatItem()] })}
                  >
                    Add Stat box
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="plus"
                    onClick={() => updateColumn(colIndex, { items: [...col.items, newPieItem()] })}
                  >
                    Add Pie chart
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="plus"
                    onClick={() => updateColumn(colIndex, { items: [...col.items, newHeadingItem()] })}
                  >
                    Add Heading
                  </Button>
                </div>
              </>
            )}
          </div>
        );
      })}

      <Button
        size="sm"
        variant="primary"
        icon="plus"
        onClick={() => onChange([...value, newColumn(value.length)])}
      >
        Add Column
      </Button>
    </div>
  );
};

import { DataFrame, Field, FieldType, GrafanaTheme2 } from '@grafana/data';
import {
  NumberFormatStyle,
  StatCalculation,
  StatColumnItem,
  StatsColumnDefinition,
  StatsColumnOptions,
  StatThreshold,
  StatValueMapping,
  ViewportVisibility,
  VisibilityRule,
} from './types';

export interface FormattedStatResult {
  valueText: string;
  unitText: string;
  color: string;
  isMapped: boolean;
}

export interface ResolvedPieSlice {
  id: string;
  label: string;
  value: number;
  percent: number;
  formattedValue: string;
  unitText: string;
  color: string;
}

const defaultPiePalette = ['purple', 'green', 'yellow', 'blue', 'orange', 'super-light-blue', 'red'];

export function findFrame(series: DataFrame[], refId?: string): DataFrame | undefined {
  if (!series.length) {
    return undefined;
  }
  if (refId) {
    const matched = series.find((frame) => frame.refId === refId || frame.name === refId);
    if (matched) {
      return matched;
    }
  }
  return series[0];
}

export function findField(series: DataFrame[], fieldName?: string, refId?: string): { frame?: DataFrame; field?: Field } {
  const trimmedField = fieldName?.trim();
  const trimmedRef = refId?.trim();

  if (trimmedRef) {
    const targetFrames = series.filter((frame) => frame.refId === trimmedRef || frame.name === trimmedRef);
    for (const targetFrame of targetFrames) {
      if (trimmedField) {
        const exact = targetFrame.fields.find(
          (candidate) => candidate.name === trimmedField || candidate.config?.displayName === trimmedField
        );
        if (exact) {
          return { frame: targetFrame, field: exact };
        }
      }
      const firstValueField =
        targetFrame.fields.find((candidate) => candidate.type !== FieldType.time) ?? targetFrame.fields[0];
      if (firstValueField && !trimmedField) {
        return { frame: targetFrame, field: firstValueField };
      }
    }
  }

  if (trimmedField) {
    for (const frame of series) {
      const field = frame.fields.find(
        (candidate) => candidate.name === trimmedField || candidate.config?.displayName === trimmedField
      );
      if (field) {
        return { frame, field };
      }
    }
  }

  if (trimmedRef) {
    const fallbackFrame = findFrame(series, trimmedRef);
    const fallbackField =
      fallbackFrame?.fields.find((candidate) => candidate.type !== FieldType.time) ?? fallbackFrame?.fields[0];
    return { frame: fallbackFrame, field: fallbackField };
  }

  return {};
}

export function selectRowIndex(
  frame: DataFrame | undefined,
  options: Pick<StatsColumnOptions, 'selectorField' | 'selectorValue' | 'rowIndex'>,
  replaceVariables: (value: string) => string
): number {
  if (!frame || frame.length === 0) {
    return 0;
  }
  const selectorField = options.selectorField?.trim();
  const selectorValue = replaceVariables(options.selectorValue ?? '').trim();
  if (selectorField && selectorValue) {
    const field = frame.fields.find((candidate) => candidate.name === selectorField);
    if (field) {
      for (let i = 0; i < frame.length; i++) {
        if (String(field.values[i]) === selectorValue) {
          return i;
        }
      }
    }
  }
  const fallback = Math.max(0, options.rowIndex ?? 0);
  return fallback < frame.length ? fallback : 0;
}

export function isNullOrEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

export function reduceFieldValues(
  frame: DataFrame,
  field: Field,
  calculation: StatCalculation,
  options: Pick<StatsColumnOptions, 'selectorField' | 'selectorValue' | 'rowIndex'>,
  replaceVariables: (value: string) => string
): unknown {
  if (frame.length === 0) {
    return undefined;
  }
  const values = Array.from({ length: frame.length }, (_, i) => field.values[i]);

  if (calculation === 'rowSelector') {
    const rowIdx = selectRowIndex(frame, options, replaceVariables);
    return values[rowIdx];
  }

  if (calculation === 'last') {
    return values[values.length - 1];
  }

  if (calculation === 'first') {
    return values[0];
  }

  const nonNullValues = values.filter((val) => !isNullOrEmpty(val) && !(typeof val === 'number' && Number.isNaN(val)));

  if (calculation === 'count') {
    return nonNullValues.length;
  }

  if (nonNullValues.length === 0) {
    const hasNaN = values.some((val) => typeof val === 'number' && Number.isNaN(val));
    return hasNaN ? Number.NaN : undefined;
  }

  if (calculation === 'lastNotNull') {
    return nonNullValues[nonNullValues.length - 1];
  }

  if (calculation === 'firstNotNull') {
    return nonNullValues[0];
  }

  const numericValues = nonNullValues.map((val) => Number(val)).filter((num) => Number.isFinite(num));
  if (numericValues.length === 0) {
    return nonNullValues[nonNullValues.length - 1];
  }

  switch (calculation) {
    case 'min':
      return Math.min(...numericValues);
    case 'max':
      return Math.max(...numericValues);
    case 'sum':
      return numericValues.reduce((acc, current) => acc + current, 0);
    case 'mean':
      return numericValues.reduce((acc, current) => acc + current, 0) / numericValues.length;
  }
}

export function calculateFieldValue(
  series: DataFrame[],
  fieldName: string | undefined,
  refId: string | undefined,
  calculation: StatCalculation,
  options: Pick<StatsColumnOptions, 'selectorField' | 'selectorValue' | 'rowIndex'>,
  replaceVariables: (value: string) => string
): { rawValue: unknown; field?: Field } {
  const { frame, field } = findField(series, fieldName, refId);
  if (!frame || !field || frame.length === 0) {
    return { rawValue: undefined, field };
  }
  return {
    rawValue: reduceFieldValues(frame, field, calculation, options, replaceVariables),
    field,
  };
}

export function formatNumberByStyle(value: number, style: NumberFormatStyle, decimals?: number): string {
  if (!Number.isFinite(value)) {
    return '-';
  }

  const resolvedDecimals =
    decimals !== undefined && decimals >= 0
      ? decimals
      : Number.isInteger(value)
        ? 0
        : Math.min(2, (String(value).split('.')[1] || '').length);

  const negative = value < 0;
  const fixed = Math.abs(value).toFixed(resolvedDecimals);
  const [integerPart, fractionPart] = fixed.split('.');

  const useGrouping = style === 'de-grouped' || style === 'en-grouped';
  const isGerman = style === 'de-grouped' || style === 'de-plain';
  const groupSeparator = isGerman ? '.' : ',';
  const decimalSeparator = isGerman ? ',' : '.';

  const groupedInteger = useGrouping
    ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator)
    : integerPart;

  const formatted = fractionPart !== undefined && fractionPart.length > 0
    ? `${groupedInteger}${decimalSeparator}${fractionPart}`
    : groupedInteger;

  return negative && Number(fixed) !== 0 ? `-${formatted}` : formatted;
}

export function matchValueMapping(value: unknown, mappings: StatValueMapping[] = []): StatValueMapping | undefined {
  for (const mapping of mappings) {
    if (mapping.type === 'special') {
      const matchType = mapping.specialMatch ?? 'null';
      if (matchType === 'null' && (value === null || value === undefined)) {
        return mapping;
      }
      if (
        matchType === 'nan' &&
        ((typeof value === 'number' && Number.isNaN(value)) || String(value) === 'NaN')
      ) {
        return mapping;
      }
      if (matchType === 'empty' && value === '') {
        return mapping;
      }
    } else if (mapping.type === 'value') {
      if (
        (!isNullOrEmpty(value) && String(value) === String(mapping.value ?? '')) ||
        (String(mapping.value) === 'NaN' && typeof value === 'number' && Number.isNaN(value))
      ) {
        return mapping;
      }
    } else if (mapping.type === 'range') {
      const numeric = typeof value === 'number' ? value : Number(value);
      if (!isNullOrEmpty(value) && Number.isFinite(numeric)) {
        const fromOk = mapping.from === undefined || Number.isNaN(mapping.from) || numeric >= mapping.from;
        const toOk = mapping.to === undefined || Number.isNaN(mapping.to) || numeric <= mapping.to;
        if (fromOk && toOk) {
          return mapping;
        }
      }
    }
  }
  return undefined;
}

export function matchesThreshold(value: unknown, threshold: StatThreshold): boolean {
  if (isNullOrEmpty(value)) {
    return false;
  }
  const numericValue = Number(value);
  const numericTarget = Number(threshold.value);
  const bothNumeric = Number.isFinite(numericValue) && threshold.value.trim() !== '' && Number.isFinite(numericTarget);

  switch (threshold.operator) {
    case 'equals':
      return bothNumeric ? numericValue === numericTarget : String(value) === threshold.value;
    case 'gt':
      return bothNumeric && numericValue > numericTarget;
    case 'gte':
      return bothNumeric && numericValue >= numericTarget;
    case 'lt':
      return bothNumeric && numericValue < numericTarget;
    case 'lte':
      return bothNumeric && numericValue <= numericTarget;
  }
}

export function resolveStatColor(
  value: unknown,
  item: StatColumnItem,
  defaultBaseColor: string,
  matchedMapping?: StatValueMapping
): string {
  if (matchedMapping?.color) {
    return matchedMapping.color;
  }
  const baseColor = item.baseColor || defaultBaseColor || 'green';
  const thresholds = item.thresholds ?? [];
  if (!thresholds.length || isNullOrEmpty(value)) {
    return baseColor;
  }

  let matchedColor: string | undefined;
  for (const step of thresholds) {
    if (matchesThreshold(value, step)) {
      matchedColor = step.color;
    }
  }
  return matchedColor ?? baseColor;
}

export function normalizeDisplayUnit(unit: string): string {
  const trimmed = unit.trim();
  if (trimmed === 'm3') {
    return 'm³';
  }
  if (trimmed === 'percent') {
    return '%';
  }
  return trimmed;
}

export function formatStatItem(
  rawValue: unknown,
  field: Field | undefined,
  item: StatColumnItem,
  options: StatsColumnOptions
): FormattedStatResult {
  const mapped = matchValueMapping(rawValue, item.valueMappings);
  const color = resolveStatColor(rawValue, item, options.defaultBaseColor, mapped);

  if (mapped) {
    return {
      valueText: mapped.text,
      unitText: '',
      color,
      isMapped: true,
    };
  }

  if (isNullOrEmpty(rawValue) || (typeof rawValue === 'number' && Number.isNaN(rawValue))) {
    return {
      valueText: item.noValueText || options.defaultNoValueText || '-',
      unitText: '',
      color,
      isMapped: false,
    };
  }

  const numberStyle: NumberFormatStyle =
    item.numberFormat && item.numberFormat !== 'inherit' ? item.numberFormat : options.numberFormat || 'de-grouped';
  const rawDecimals = item.decimals ?? field?.config?.decimals;
  const decimals = rawDecimals === null ? undefined : rawDecimals;
  const configuredUnit = normalizeDisplayUnit(item.unit ?? field?.config?.unit ?? '');

  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    return {
      valueText: formatNumberByStyle(rawValue, numberStyle, decimals),
      unitText: configuredUnit,
      color,
      isMapped: false,
    };
  }

  const textValue = String(rawValue).trim();
  const numericWithOptionalUnit = textValue.match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/);
  if (numericWithOptionalUnit) {
    const parsedNum = Number(numericWithOptionalUnit[1]);
    const embeddedUnit = normalizeDisplayUnit(numericWithOptionalUnit[2] || '');
    const inferredDecimals =
      decimals !== undefined
        ? decimals
        : numericWithOptionalUnit[1].includes('.')
          ? numericWithOptionalUnit[1].split('.')[1].length
          : 0;
    const resolvedColor = resolveStatColor(parsedNum, item, options.defaultBaseColor);
    return {
      valueText: formatNumberByStyle(parsedNum, numberStyle, inferredDecimals),
      unitText: configuredUnit || embeddedUnit,
      color: resolvedColor,
      isMapped: false,
    };
  }

  return {
    valueText: textValue,
    unitText: '',
    color,
    isMapped: false,
  };
}

function deriveSeriesSliceLabel(frame: DataFrame, field: Field): string {
  if (field.labels?.well_name) {
    return field.labels.well_name;
  }
  const candidates = [field.config?.displayNameFromDS, field.config?.displayName, frame.name, field.name].filter(
    Boolean
  ) as string[];
  for (const candidate of candidates) {
    const wellMatch = candidate.match(/well_name:\s*([^,}]+)/i);
    if (wellMatch) {
      return wellMatch[1].trim();
    }
  }
  return candidates[0] || 'Series';
}

export function resolvePieSlices(
  item: StatColumnItem,
  series: DataFrame[],
  options: StatsColumnOptions,
  replaceVariables: (value: string) => string
): ResolvedPieSlice[] {
  const numberStyle: NumberFormatStyle =
    item.numberFormat && item.numberFormat !== 'inherit' ? item.numberFormat : options.numberFormat || 'de-grouped';
  const unitText = normalizeDisplayUnit(item.unit ?? 'm³');
  const defaultCalc = item.calculation || options.defaultCalculation || 'lastNotNull';
  const configuredSlices = item.pieSlices ?? [];

  const rawSlices: Array<{ id: string; label: string; value: number; color: string }> = [];
  let paletteIdx = 0;
  const nextPaletteColor = () => defaultPiePalette[paletteIdx++ % defaultPiePalette.length];

  if (configuredSlices.length > 0) {
    for (const sliceCfg of configuredSlices) {
      const calc = sliceCfg.calculation || defaultCalc;
      const trimmedRef = sliceCfg.refId?.trim();
      const trimmedField = sliceCfg.field?.trim();

      if (trimmedRef && !trimmedField) {
        const matchingFrames = series.filter((f) => f.refId === trimmedRef || f.name === trimmedRef);
        const valueFields = matchingFrames.flatMap((frame) =>
          frame.fields
            .filter((field) => field.type !== FieldType.time)
            .map((field) => ({ frame, field }))
        );

        if (valueFields.length > 1) {
          for (const { frame, field } of valueFields) {
            const raw = reduceFieldValues(frame, field, calc, options, replaceVariables);
            const num = Number(raw);
            if (Number.isFinite(num) && num > 0) {
              const autoLabel = deriveSeriesSliceLabel(frame, field);
              rawSlices.push({
                id: `${sliceCfg.id}-${autoLabel}`,
                label: replaceVariables(sliceCfg.label?.trim() ? `${sliceCfg.label} (${autoLabel})` : autoLabel),
                value: num,
                color: sliceCfg.color || nextPaletteColor(),
              });
            }
          }
          continue;
        }
      }

      const { rawValue, field } = calculateFieldValue(series, trimmedField, trimmedRef, calc, options, replaceVariables);
      const num = Number(rawValue);
      if (Number.isFinite(num) && num > 0) {
        const fallbackLabel =
          sliceCfg.label?.trim() ||
          (field ? deriveSeriesSliceLabel(series[0], field) : trimmedField || trimmedRef || 'Slice');
        rawSlices.push({
          id: sliceCfg.id,
          label: replaceVariables(fallbackLabel),
          value: num,
          color: sliceCfg.color || nextPaletteColor(),
        });
      }
    }
  } else {
    const targetFrames = item.refId?.trim()
      ? series.filter((f) => f.refId === item.refId?.trim() || f.name === item.refId?.trim())
      : series;
    for (const frame of targetFrames) {
      for (const field of frame.fields) {
        if (field.type === FieldType.time) {
          continue;
        }
        const raw = reduceFieldValues(frame, field, defaultCalc, options, replaceVariables);
        const num = Number(raw);
        if (Number.isFinite(num) && num > 0) {
          const label = deriveSeriesSliceLabel(frame, field);
          rawSlices.push({
            id: `${frame.refId || 'f'}-${field.name}`,
            label: replaceVariables(label),
            value: num,
            color: nextPaletteColor(),
          });
        }
      }
    }
  }

  const sortOrder = item.pieSort ?? 'desc';
  if (sortOrder === 'desc') {
    rawSlices.sort((a, b) => b.value - a.value);
  } else if (sortOrder === 'asc') {
    rawSlices.sort((a, b) => a.value - b.value);
  }

  const total = rawSlices.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) {
    return [];
  }

  return rawSlices.map((s) => ({
    id: s.id,
    label: s.label,
    value: s.value,
    percent: (s.value / total) * 100,
    formattedValue: formatNumberByStyle(s.value, numberStyle, item.decimals),
    unitText,
    color: s.color,
  }));
}

export function normalizeVariableSyntax(target: string): string {
  const trimmed = target.trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('$')) {
    return trimmed;
  }
  return `$${trimmed}`;
}

export function isViewportVisible(visibility: ViewportVisibility | undefined, isMobileViewport: boolean): boolean {
  if (!visibility || visibility === 'all') {
    return true;
  }
  if (visibility === 'desktopOnly') {
    return !isMobileViewport;
  }
  return isMobileViewport;
}

export function isRuleVisible(
  rule: VisibilityRule | undefined,
  series: DataFrame[],
  options: Pick<StatsColumnOptions, 'selectorField' | 'selectorValue' | 'rowIndex' | 'defaultCalculation'>,
  replaceVariables: (value: string) => string
): boolean {
  if (!rule || !rule.enabled || !rule.target?.trim()) {
    return true;
  }

  let actualValue = '';
  if (rule.source === 'variable') {
    const token = normalizeVariableSyntax(rule.target);
    const replaced = replaceVariables(token);
    actualValue = replaced === token ? '' : replaced;
  } else {
    const { rawValue } = calculateFieldValue(
      series,
      rule.target.trim(),
      undefined,
      options.defaultCalculation || 'lastNotNull',
      options,
      replaceVariables
    );
    actualValue = isNullOrEmpty(rawValue) ? '' : String(rawValue);
  }

  const expectedValue = replaceVariables(rule.value ?? '');

  switch (rule.operator) {
    case 'empty':
      return actualValue.trim() === '';
    case 'notEmpty':
      return actualValue.trim() !== '';
    case 'equals':
      return actualValue === expectedValue;
    case 'notEquals':
      return actualValue !== expectedValue;
    case 'contains':
      return actualValue.toLowerCase().includes(expectedValue.toLowerCase());
    case 'notContains':
      return !actualValue.toLowerCase().includes(expectedValue.toLowerCase());
    case 'gt':
      return Number(actualValue) > Number(expectedValue);
    case 'gte':
      return Number(actualValue) >= Number(expectedValue);
    case 'lt':
      return Number(actualValue) < Number(expectedValue);
    case 'lte':
      return Number(actualValue) <= Number(expectedValue);
    case 'regex':
      try {
        return new RegExp(expectedValue).test(actualValue);
      } catch {
        return true;
      }
  }
}

export function resolveThemeColor(color: string, theme: GrafanaTheme2): string {
  const palette: Record<string, string> = {
    green: '#73BF69',
    'super-light-blue': '#8AB8FF',
    'light-blue': '#8AB8FF',
    blue: '#5794F2',
    yellow: '#FADE2A',
    orange: '#FF9830',
    red: '#F2495C',
    'dark-red': '#C4162A',
    purple: '#B877D9',
    white: theme.colors.text.primary,
    gray: theme.colors.text.secondary,
  };
  return palette[color.toLowerCase()] || color;
}

export const columnTemplates: Record<string, StatsColumnDefinition[]> = {
  waterMonitoring: [
    {
      id: 'col-left',
      title: '',
      titleAlign: 'center',
      items: [
        {
          id: 'zaehlerstand',
          kind: 'stat',
          title: 'Letzter Zählerstand',
          field: 'letzter_zaehlerstand',
          unit: 'm³',
          decimals: 0,
          baseColor: 'green',
        },
        {
          id: 'pegelstand',
          kind: 'stat',
          title: 'Letzter Pegelstand',
          field: 'letzter_pegelstand',
          unit: 'm ü. NHN',
          decimals: 0,
          baseColor: 'super-light-blue',
          noValueText: '⚠️ No pegelstand value to show.',
        },
        {
          id: 'heading-single-well',
          kind: 'heading',
          title: 'Single Well',
          headingAlign: 'center',
          headingSize: 'lg',
        },
        {
          id: 'individual-quota',
          kind: 'stat',
          title: 'Individual Quota',
          field: 'individual_quota',
          unit: 'm³',
          decimals: 2,
          baseColor: 'green',
          noValueText: '⚠️ no single quota exists',
        },
        {
          id: 'gesamtentnahme',
          kind: 'stat',
          title: 'Erfolgte Gesamtentnahme laufendes Jahr',
          field: 'gesamtentnahme_jahr',
          unit: 'm³',
          decimals: 0,
          baseColor: 'green',
          noValueText: '0 m³',
        },
        {
          id: 'percentage-individual',
          kind: 'stat',
          title: 'Percentage individual',
          tooltip: 'Single well Percentage',
          field: 'percentage_individual',
          unit: '%',
          decimals: 1,
          baseColor: 'green',
          noValueText: '⚠️ No quota assigned, percentage cannot be calculated',
          valueMappings: [
            {
              type: 'special',
              specialMatch: 'nan',
              text: 'No quota assigned, percentage cannot be calculated',
              color: 'gray',
            },
          ],
          thresholds: [
            { operator: 'gte', value: '40', color: 'yellow' },
            { operator: 'gte', value: '60', color: 'orange' },
            { operator: 'gte', value: '80', color: 'red' },
          ],
        },
      ],
    },
    {
      id: 'col-right',
      title: '',
      titleAlign: 'center',
      items: [
        {
          id: 'entnahme-12h',
          kind: 'stat',
          title: 'Wasserentnahmen letzte 12 Std.',
          field: 'entnahme_12h',
          unit: 'm³',
          decimals: 0,
          baseColor: 'green',
          noValueText: '0 m³',
        },
        {
          id: 'entnahme-24h',
          kind: 'stat',
          title: 'Wasserentnahmen letzte 24 Std.',
          field: 'entnahme_24h',
          unit: 'm³',
          decimals: 0,
          baseColor: 'green',
          noValueText: '0 m³',
        },
        {
          id: 'heading-well-group',
          kind: 'heading',
          title: 'Well Group',
          headingAlign: 'center',
          headingSize: 'lg',
        },
        {
          id: 'group-quota',
          kind: 'stat',
          title: 'Group Quota',
          field: 'group_quota',
          unit: 'm³',
          decimals: 2,
          baseColor: 'green',
          noValueText: '⚠️ no group quota exisits.',
        },
        {
          id: 'group-quota-pie',
          kind: 'pie',
          title: '',
          tooltip: 'Consumption per well vs quota',
          unit: 'm³',
          decimals: 0,
          pieType: 'pie',
          pieDisplayLabels: 'percent',
          pieSort: 'desc',
          pieShowLegend: true,
          minHeight: 272,
          pieSlices: [
            { id: 'slice-lb02', label: 'LB02', field: 'lb02_consumption', color: 'purple' },
            { id: 'slice-rem', label: 'Remaining Quota', field: 'remaining_group_quota', color: 'green' },
            { id: 'slice-lb01', label: 'LB01', field: 'lb01_consumption', color: 'yellow' },
          ],
        },
      ],
    },
  ],
  threeSubjects: [
    {
      id: 'subject-1',
      title: 'Subject 1',
      titleAlign: 'center',
      items: [
        { id: '1a', kind: 'stat', title: 'Measurement 1a', field: 'metric_1a', unit: 'm³', decimals: 1, baseColor: 'green' },
        { id: '1b', kind: 'stat', title: 'Measurement 1b', field: 'metric_1b', unit: 'm³', decimals: 1, baseColor: 'green' },
      ],
    },
    {
      id: 'subject-2',
      title: 'Subject 2',
      titleAlign: 'center',
      items: [
        { id: '2a', kind: 'stat', title: 'Measurement 2a', field: 'metric_2a', unit: 'bar', decimals: 2, baseColor: 'light-blue' },
        { id: '2b', kind: 'stat', title: 'Measurement 2b', field: 'metric_2b', unit: 'bar', decimals: 2, baseColor: 'light-blue' },
      ],
    },
    {
      id: 'subject-3',
      title: 'Subject 3',
      titleAlign: 'center',
      items: [
        { id: '3a', kind: 'stat', title: 'Measurement 3a', field: 'metric_3a', unit: '%', decimals: 1, baseColor: 'yellow' },
        { id: '3b', kind: 'stat', title: 'Measurement 3b', field: 'metric_3b', unit: '%', decimals: 1, baseColor: 'yellow' },
      ],
    },
  ],
};

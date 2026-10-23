import { DataFrame, Field, FieldType, GrafanaTheme2 } from '@grafana/data';
import {
  NumberFormatStyle,
  StatCalculation,
  StatColumnItem,
  StatsColumnDefinition,
  StatsColumnOptions,
  StatThreshold,
  StatValueMapping,
  TimestampFormat,
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

export function resolveRowIndexForCalculation(
  frame: DataFrame,
  field: Field,
  calculation: StatCalculation,
  options: Pick<StatsColumnOptions, 'selectorField' | 'selectorValue' | 'rowIndex'>,
  replaceVariables: (value: string) => string
): number {
  if (frame.length === 0) {
    return 0;
  }
  if (calculation === 'rowSelector') {
    return selectRowIndex(frame, options, replaceVariables);
  }
  if (calculation === 'first') {
    return 0;
  }
  if (calculation === 'firstNotNull') {
    for (let i = 0; i < frame.length; i++) {
      const val = field.values[i];
      if (!isNullOrEmpty(val) && !(typeof val === 'number' && Number.isNaN(val))) {
        return i;
      }
    }
    return 0;
  }
  for (let i = frame.length - 1; i >= 0; i--) {
    const val = field.values[i];
    if (!isNullOrEmpty(val) && !(typeof val === 'number' && Number.isNaN(val))) {
      return i;
    }
  }
  return frame.length - 1;
}

export function calculateFieldValue(
  series: DataFrame[],
  fieldName: string | undefined,
  refId: string | undefined,
  calculation: StatCalculation,
  options: Pick<StatsColumnOptions, 'selectorField' | 'selectorValue' | 'rowIndex'>,
  replaceVariables: (value: string) => string
): { rawValue: unknown; field?: Field; frame?: DataFrame; rowIndex?: number } {
  const { frame, field } = findField(series, fieldName, refId);
  if (!frame || !field || frame.length === 0) {
    return { rawValue: undefined, field, frame };
  }
  return {
    rawValue: reduceFieldValues(frame, field, calculation, options, replaceVariables),
    field,
    frame,
    rowIndex: resolveRowIndexForCalculation(frame, field, calculation, options, replaceVariables),
  };
}

export function formatTimestampByStyle(
  rawTime: unknown,
  format: TimestampFormat = 'DD.MM.YYYY HH:mm:ss',
  useUtc = false
): string {
  if (isNullOrEmpty(rawTime)) {
    return '';
  }

  let dateObj: Date | undefined;
  if (rawTime instanceof Date) {
    dateObj = rawTime;
  } else if (typeof rawTime === 'number' && Number.isFinite(rawTime)) {
    const ms = rawTime > 0 && rawTime < 1e11 ? rawTime * 1000 : rawTime;
    dateObj = new Date(ms);
  } else {
    const str = String(rawTime).trim();
    if (/^\d+(\.\d+)?$/.test(str)) {
      const num = Number(str);
      const ms = num > 0 && num < 1e11 ? num * 1000 : num;
      dateObj = new Date(ms);
    } else {
      const parsed = Date.parse(str);
      if (!Number.isNaN(parsed)) {
        dateObj = new Date(parsed);
      }
    }
  }

  if (!dateObj || Number.isNaN(dateObj.getTime())) {
    return String(rawTime).trim();
  }

  const pad2 = (n: number) => String(n).padStart(2, '0');
  const year = useUtc ? dateObj.getUTCFullYear() : dateObj.getFullYear();
  const month = pad2((useUtc ? dateObj.getUTCMonth() : dateObj.getMonth()) + 1);
  const day = pad2(useUtc ? dateObj.getUTCDate() : dateObj.getDate());
  const hours = pad2(useUtc ? dateObj.getUTCHours() : dateObj.getHours());
  const minutes = pad2(useUtc ? dateObj.getUTCMinutes() : dateObj.getMinutes());
  const seconds = pad2(useUtc ? dateObj.getUTCSeconds() : dateObj.getSeconds());

  switch (format) {
    case 'DD.MM.YYYY HH:mm':
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    case 'YYYY-MM-DD HH:mm:ss':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    case 'HH:mm:ss':
      return `${hours}:${minutes}:${seconds}`;
    case 'DD.MM.YYYY HH:mm:ss':
    default:
      return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
  }
}

export function resolveItemTimestamp(
  series: DataFrame[],
  item: StatColumnItem,
  matchedFrame: DataFrame | undefined,
  matchedRowIndex: number | undefined,
  options: StatsColumnOptions,
  replaceVariables: (value: string) => string
): string {
  const showMode = item.showTimestamp ?? 'inherit';
  const shouldShow =
    showMode === 'show' || (showMode === 'inherit' && Boolean(options.defaultShowTimestamp));
  if (!shouldShow) {
    return '';
  }

  const targetFrame = matchedFrame ?? findFrame(series, item.refId);
  if (!targetFrame || targetFrame.length === 0) {
    return '';
  }

  const customTimeFieldName = item.timestampField?.trim();
  let timeField: Field | undefined;

  if (customTimeFieldName) {
    timeField = targetFrame.fields.find(
      (f) => f.name === customTimeFieldName || f.config?.displayName === customTimeFieldName
    );
    if (!timeField) {
      const found = findField(series, customTimeFieldName, item.refId);
      timeField = found.field;
    }
  } else {
    timeField =
      targetFrame.fields.find((f) => f.type === FieldType.time) ??
      targetFrame.fields.find((f) =>
        ['time', 'timestamp', 'last_updated', 'updated_at', 'zeit', 'datum'].includes(f.name.toLowerCase())
      );
  }

  if (!timeField || timeField.values.length === 0) {
    return '';
  }

  const rowIdx =
    matchedRowIndex !== undefined && matchedRowIndex >= 0 && matchedRowIndex < timeField.values.length
      ? matchedRowIndex
      : timeField.values.length - 1;

  let rawTime = timeField.values[rowIdx];
  if (isNullOrEmpty(rawTime)) {
    for (let i = timeField.values.length - 1; i >= 0; i--) {
      if (!isNullOrEmpty(timeField.values[i])) {
        rawTime = timeField.values[i];
        break;
      }
    }
  }

  const format: TimestampFormat =
    item.timestampFormat && item.timestampFormat !== 'inherit'
      ? item.timestampFormat
      : options.defaultTimestampFormat || 'DD.MM.YYYY HH:mm:ss';

  const formattedTime = formatTimestampByStyle(rawTime, format);
  if (!formattedTime) {
    return '';
  }

  const rawPrefix =
    item.timestampPrefix !== undefined
      ? item.timestampPrefix
      : options.defaultTimestampPrefix ?? 'Last updated:';
  const prefix = replaceVariables(rawPrefix).trim();

  return prefix ? `${prefix} ${formattedTime}` : formattedTime;
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
  const firstLabelValue = field.labels ? Object.values(field.labels)[0] : undefined;
  if (firstLabelValue) {
    return firstLabelValue;
  }
  const candidates = [field.config?.displayNameFromDS, field.config?.displayName, frame.name, field.name].filter(
    Boolean
  ) as string[];
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
  const unitText = normalizeDisplayUnit(item.unit ?? '');
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
  telemetryOverview: [
    {
      id: 'col-left',
      title: '',
      titleAlign: 'center',
      items: [
        {
          id: 'total-energy',
          kind: 'stat',
          title: 'Total Energy Reading',
          field: 'total_energy_kwh',
          unit: 'kWh',
          decimals: 0,
          baseColor: 'green',
        },
        {
          id: 'grid-voltage',
          kind: 'stat',
          title: 'Grid Voltage',
          field: 'grid_voltage_v',
          unit: 'V',
          decimals: 0,
          baseColor: 'super-light-blue',
          noValueText: '⚠️ No voltage telemetry available.',
        },
        {
          id: 'heading-single-node',
          kind: 'heading',
          title: 'Node Telemetry',
          headingAlign: 'center',
          headingSize: 'lg',
        },
        {
          id: 'node-capacity',
          kind: 'stat',
          title: 'Allocated Node Capacity',
          field: 'node_capacity_kwh',
          unit: 'kWh',
          decimals: 2,
          baseColor: 'green',
          noValueText: '⚠️ No node capacity configured',
        },
        {
          id: 'annual-usage',
          kind: 'stat',
          title: 'Cumulative Annual Usage',
          field: 'annual_usage_kwh',
          unit: 'kWh',
          decimals: 0,
          baseColor: 'green',
          noValueText: '0 kWh',
        },
        {
          id: 'utilization-pct',
          kind: 'stat',
          title: 'Capacity Utilization',
          tooltip: 'Current node utilization percentage',
          field: 'utilization_pct',
          unit: '%',
          decimals: 1,
          baseColor: 'green',
          noValueText: '⚠️ Capacity not assigned',
          valueMappings: [
            {
              type: 'special',
              specialMatch: 'nan',
              text: 'Capacity not assigned, utilization cannot be calculated',
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
          id: 'usage-12h',
          kind: 'stat',
          title: 'Energy Usage (Last 12h)',
          field: 'usage_12h_kwh',
          unit: 'kWh',
          decimals: 0,
          baseColor: 'green',
          noValueText: '0 kWh',
        },
        {
          id: 'usage-24h',
          kind: 'stat',
          title: 'Energy Usage (Last 24h)',
          field: 'usage_24h_kwh',
          unit: 'kWh',
          decimals: 0,
          baseColor: 'green',
          noValueText: '0 kWh',
        },
        {
          id: 'heading-cluster',
          kind: 'heading',
          title: 'Cluster Summary',
          headingAlign: 'center',
          headingSize: 'lg',
        },
        {
          id: 'cluster-capacity',
          kind: 'stat',
          title: 'Cluster Total Capacity',
          field: 'cluster_capacity_kwh',
          unit: 'kWh',
          decimals: 2,
          baseColor: 'green',
          noValueText: '⚠️ No cluster capacity configured.',
        },
        {
          id: 'cluster-pie',
          kind: 'pie',
          title: '',
          tooltip: 'Energy distribution across cluster nodes',
          unit: 'kWh',
          decimals: 0,
          pieType: 'pie',
          pieDisplayLabels: 'percent',
          pieSort: 'desc',
          pieShowLegend: true,
          minHeight: 272,
          pieSlices: [
            { id: 'slice-node-b', label: 'Node-B', field: 'node_b_usage', color: 'purple' },
            { id: 'slice-rem', label: 'Available Capacity', field: 'available_capacity', color: 'green' },
            { id: 'slice-node-a', label: 'Node-A', field: 'node_a_usage', color: 'yellow' },
          ],
        },
      ],
    },
  ],
  threeColumns: [
    {
      id: 'col-compute',
      title: 'Compute',
      titleAlign: 'center',
      items: [
        { id: 'cpu-load', kind: 'stat', title: 'CPU Load', field: 'cpu_load', unit: '%', decimals: 1, baseColor: 'green' },
        { id: 'mem-used', kind: 'stat', title: 'Memory Used', field: 'mem_used', unit: 'GB', decimals: 2, baseColor: 'green' },
      ],
    },
    {
      id: 'col-network',
      title: 'Network',
      titleAlign: 'center',
      items: [
        { id: 'rx-rate', kind: 'stat', title: 'Inbound Traffic', field: 'rx_mbps', unit: 'Mbps', decimals: 2, baseColor: 'light-blue' },
        { id: 'tx-rate', kind: 'stat', title: 'Outbound Traffic', field: 'tx_mbps', unit: 'Mbps', decimals: 1, baseColor: 'light-blue' },
      ],
    },
    {
      id: 'col-environment',
      title: 'Environment',
      titleAlign: 'center',
      items: [
        { id: 'rack-humidity', kind: 'stat', title: 'Rack Humidity', field: 'humidity_pct', unit: '%', decimals: 1, baseColor: 'yellow' },
        { id: 'rack-temp', kind: 'stat', title: 'Inlet Temp', field: 'temp_c', unit: '°C', decimals: 1, baseColor: 'orange' },
      ],
    },
  ],
};

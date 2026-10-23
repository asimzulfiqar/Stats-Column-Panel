export type NumberFormatStyle = 'de-grouped' | 'en-grouped' | 'en-plain' | 'de-plain';

export type TimestampFormat =
  | 'DD.MM.YYYY HH:mm:ss'
  | 'DD.MM.YYYY HH:mm'
  | 'YYYY-MM-DD HH:mm:ss'
  | 'HH:mm:ss';

export type StatCalculation =
  | 'lastNotNull'
  | 'last'
  | 'firstNotNull'
  | 'first'
  | 'min'
  | 'max'
  | 'mean'
  | 'sum'
  | 'count'
  | 'rowSelector';

export type StatColorMode = 'value' | 'background' | 'background-gradient' | 'none';

export type ThresholdOperator = 'gte' | 'gt' | 'lte' | 'lt' | 'equals';

export type VisibilityOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'empty'
  | 'notEmpty'
  | 'regex';

export type ViewportVisibility = 'all' | 'desktopOnly' | 'mobileOnly';

export interface VisibilityRule {
  enabled?: boolean;
  source: 'variable' | 'field';
  target: string;
  operator: VisibilityOperator;
  value?: string;
}

export interface StatThreshold {
  operator: ThresholdOperator;
  value: string;
  color: string;
}

export interface StatValueMapping {
  type: 'value' | 'range' | 'special';
  value?: string;
  from?: number;
  to?: number;
  specialMatch?: 'null' | 'nan' | 'empty';
  text: string;
  color?: string;
}

export type ColumnItemKind = 'stat' | 'heading' | 'pie';

export type PieChartType = 'pie' | 'donut';
export type PieDisplayLabel = 'percent' | 'value' | 'name' | 'none';
export type PieSliceSort = 'desc' | 'asc' | 'none';

export interface PieSliceConfig {
  id: string;
  label?: string;
  refId?: string;
  field?: string;
  calculation?: StatCalculation;
  color?: string;
}

export interface PieSeriesColorRule {
  id: string;
  pattern: string;
  color: string;
}

export interface StatColumnItem {
  id: string;
  kind: ColumnItemKind;
  title: string;
  tooltip?: string;
  headingAlign?: 'left' | 'center' | 'right';
  headingSize?: 'sm' | 'md' | 'lg';
  refId?: string;
  field?: string;
  calculation?: StatCalculation;
  unit?: string;
  decimals?: number;
  numberFormat?: 'inherit' | NumberFormatStyle;
  colorMode?: 'inherit' | StatColorMode;
  baseColor?: string;
  thresholds?: StatThreshold[];
  valueMappings?: StatValueMapping[];
  noValueText?: string;
  showTimestamp?: 'inherit' | 'show' | 'hide';
  timestampField?: string;
  timestampPrefix?: string;
  timestampFormat?: 'inherit' | TimestampFormat;
  minHeight?: number;
  widthPercent?: number;
  titleFontSize?: number;
  valueFontSize?: number;
  pieSize?: number;
  pieType?: PieChartType;
  pieDisplayLabels?: PieDisplayLabel;
  pieSort?: PieSliceSort;
  pieShowLegend?: boolean;
  pieSlices?: PieSliceConfig[];
  pieSeriesColors?: PieSeriesColorRule[];
  viewportVisibility?: ViewportVisibility;
  visibility?: VisibilityRule;
}

export interface StatsColumnDefinition {
  id: string;
  title?: string;
  titleAlign?: 'left' | 'center' | 'right';
  widthWeight?: number;
  items: StatColumnItem[];
  viewportVisibility?: ViewportVisibility;
  visibility?: VisibilityRule;
}

export interface StatsColumnOptions {
  numberFormat: NumberFormatStyle;
  defaultCalculation: StatCalculation;
  defaultColorMode: StatColorMode;
  defaultBaseColor: string;
  defaultNoValueText: string;
  defaultShowTimestamp?: boolean;
  defaultTimestampPrefix?: string;
  defaultTimestampFormat?: TimestampFormat;
  timestampFontSize?: number;
  selectorField: string;
  selectorValue: string;
  rowIndex: number;
  maxColumns: number;
  minColumnWidth: number;
  columnGap: number;
  rowGap: number;
  cardMinHeight: number;
  titleFontSize: number;
  valueFontSize: number;
  headingFontSize: number;
  valueAlign: 'center' | 'left' | 'right';
  cardBorder: 'none' | 'subtle' | 'strong';
  cardRadius: 'small' | 'medium' | 'large';
  enableInteractiveResize?: boolean;
  columns: StatsColumnDefinition[];
}

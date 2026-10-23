import { FieldType, toDataFrame } from '@grafana/data';
import {
  calculateFieldValue,
  formatNumberByStyle,
  formatStatItem,
  isRuleVisible,
  isViewportVisible,
  matchValueMapping,
  resolvePieSlices,
  resolveStatColor,
} from './utils';
import { StatColumnItem, StatsColumnOptions } from './types';

const defaultOptions: StatsColumnOptions = {
  numberFormat: 'de-grouped',
  defaultCalculation: 'lastNotNull',
  defaultColorMode: 'value',
  defaultBaseColor: 'green',
  defaultNoValueText: '-',
  selectorField: 'well_id',
  selectorValue: '',
  rowIndex: 0,
  maxColumns: 2,
  minColumnWidth: 260,
  columnGap: 12,
  rowGap: 12,
  cardMinHeight: 130,
  titleFontSize: 15,
  valueFontSize: 48,
  headingFontSize: 26,
  valueAlign: 'center',
  cardBorder: 'subtle',
  cardRadius: 'medium',
  columns: [],
};

describe('Stats Column Panel utilities', () => {
  describe('formatNumberByStyle', () => {
    it('formats German grouped numbers (10.000,56 and 5,62)', () => {
      expect(formatNumberByStyle(10000.56, 'de-grouped', 2)).toBe('10.000,56');
      expect(formatNumberByStyle(5.62, 'de-grouped', 2)).toBe('5,62');
      expect(formatNumberByStyle(22000, 'de-grouped', 2)).toBe('22.000,00');
      expect(formatNumberByStyle(9655, 'de-grouped', 0)).toBe('9.655');
    });

    it('formats English grouped numbers (10,000.56 and 5.62)', () => {
      expect(formatNumberByStyle(10000.56, 'en-grouped', 2)).toBe('10,000.56');
      expect(formatNumberByStyle(5.62, 'en-grouped', 2)).toBe('5.62');
    });

    it('formats plain English numbers without thousands separator (10000.56)', () => {
      expect(formatNumberByStyle(10000.56, 'en-plain', 2)).toBe('10000.56');
      expect(formatNumberByStyle(22000, 'en-plain', 2)).toBe('22000.00');
      expect(formatNumberByStyle(9655, 'en-plain', 0)).toBe('9655');
    });

    it('formats plain German numbers without thousands separator (10000,56)', () => {
      expect(formatNumberByStyle(10000.56, 'de-plain', 2)).toBe('10000,56');
      expect(formatNumberByStyle(5.62, 'de-plain', 2)).toBe('5,62');
    });
  });

  describe('calculateFieldValue', () => {
    const frame = toDataFrame({
      refId: 'A',
      fields: [
        { name: 'well_id', type: FieldType.string, values: ['LB01', 'LB02', 'LB03'] },
        { name: 'quota', type: FieldType.number, values: [100, 250, null] },
      ],
    });

    const timeSeriesFrame = toDataFrame({
      refId: 'B',
      fields: [
        { name: 'Time', type: FieldType.time, values: [1000, 2000] },
        { name: 'reading-watermeter', type: FieldType.number, values: [9600, 9655] },
      ],
    });

    it('reduces field values using lastNotNull, min, max, mean, sum, count, and rowSelector', () => {
      const replace = (val: string) => val.replace('$well', 'LB02');
      expect(calculateFieldValue([frame], 'quota', 'A', 'lastNotNull', defaultOptions, replace).rawValue).toBe(250);
      expect(calculateFieldValue([frame], 'quota', 'A', 'last', defaultOptions, replace).rawValue).toBeNull();
      expect(calculateFieldValue([frame], 'quota', 'A', 'first', defaultOptions, replace).rawValue).toBe(100);
      expect(calculateFieldValue([frame], 'quota', 'A', 'min', defaultOptions, replace).rawValue).toBe(100);
      expect(calculateFieldValue([frame], 'quota', 'A', 'max', defaultOptions, replace).rawValue).toBe(250);
      expect(calculateFieldValue([frame], 'quota', 'A', 'sum', defaultOptions, replace).rawValue).toBe(350);
      expect(calculateFieldValue([frame], 'quota', 'A', 'mean', defaultOptions, replace).rawValue).toBe(175);
      expect(calculateFieldValue([frame], 'quota', 'A', 'count', defaultOptions, replace).rawValue).toBe(2);

      const selectorOpts = { ...defaultOptions, selectorField: 'well_id', selectorValue: '$well' };
      expect(calculateFieldValue([frame], 'quota', 'A', 'rowSelector', selectorOpts, replace).rawValue).toBe(250);
    });

    it('picks the first non-time field automatically when only refId is provided', () => {
      const replace = (val: string) => val;
      expect(calculateFieldValue([frame, timeSeriesFrame], '', 'B', 'lastNotNull', defaultOptions, replace).rawValue).toBe(9655);
    });
  });

  describe('thresholds, value mappings, and SQL string with unit', () => {
    const statItem: StatColumnItem = {
      id: 'pct',
      kind: 'stat',
      title: 'Percentage individual',
      field: 'pct',
      unit: '%',
      decimals: 1,
      baseColor: 'green',
      thresholds: [
        { operator: 'gte', value: '40', color: 'yellow' },
        { operator: 'gte', value: '80', color: 'red' },
      ],
      valueMappings: [
        { type: 'special', specialMatch: 'null', text: 'Offline', color: 'gray' },
        { type: 'special', specialMatch: 'nan', text: 'No quota assigned, percentage cannot be calculated', color: 'gray' },
        { type: 'range', from: 100, to: 999, text: 'Quota Exceeded', color: 'red' },
      ],
    };

    it('resolves threshold colors in order', () => {
      expect(resolveStatColor(25, statItem, 'green')).toBe('green');
      expect(resolveStatColor(43.9, statItem, 'green')).toBe('yellow');
      expect(resolveStatColor(85, statItem, 'green')).toBe('red');
    });

    it('applies value mappings, NaN handling, and SQL string parsing', () => {
      const normal = formatStatItem(43.9, undefined, statItem, { ...defaultOptions, numberFormat: 'en-plain' });
      expect(normal.valueText).toBe('43.9');
      expect(normal.unitText).toBe('%');
      expect(normal.color).toBe('yellow');

      const mappedNull = formatStatItem(null, undefined, statItem, defaultOptions);
      expect(mappedNull.valueText).toBe('Offline');
      expect(mappedNull.color).toBe('gray');

      const mappedNaN = formatStatItem(Number.NaN, undefined, statItem, defaultOptions);
      expect(mappedNaN.valueText).toBe('No quota assigned, percentage cannot be calculated');

      const sqlNumericWithUnit = formatStatItem(
        '22000.00 m³',
        undefined,
        { id: 'q', kind: 'stat', title: 'Individual Quota', decimals: 2, baseColor: 'green' },
        { ...defaultOptions, numberFormat: 'de-grouped' }
      );
      expect(sqlNumericWithUnit.valueText).toBe('22.000,00');
      expect(sqlNumericWithUnit.unitText).toBe('m³');

      const sqlWarning = formatStatItem(
        '⚠️ no single quota exists',
        undefined,
        { id: 'q', kind: 'stat', title: 'Individual Quota', unit: 'm³', baseColor: 'green' },
        defaultOptions
      );
      expect(sqlWarning.valueText).toBe('⚠️ no single quota exists');
      expect(sqlWarning.unitText).toBe('');

      const mappedRange = matchValueMapping(120, statItem.valueMappings);
      expect(mappedRange?.text).toBe('Quota Exceeded');
    });
  });

  describe('resolvePieSlices', () => {
    const pieFrame = toDataFrame({
      refId: 'A',
      fields: [
        { name: 'lb02_consumption', type: FieldType.number, values: [14760] },
        { name: 'remaining_group_quota', type: FieldType.number, values: [11520] },
        { name: 'lb01_consumption', type: FieldType.number, values: [9720] },
      ],
    });

    it('calculates pie slice percentages and sorts descending', () => {
      const pieItem: StatColumnItem = {
        id: 'pie-1',
        kind: 'pie',
        title: '',
        unit: 'm³',
        decimals: 0,
        pieSort: 'desc',
        pieSlices: [
          { id: 's1', label: 'LB01', field: 'lb01_consumption', color: 'yellow' },
          { id: 's2', label: 'LB02', field: 'lb02_consumption', color: 'purple' },
          { id: 's3', label: 'Remaining Quota', field: 'remaining_group_quota', color: 'green' },
        ],
      };

      const slices = resolvePieSlices(pieItem, [pieFrame], defaultOptions, (v) => v);
      expect(slices).toHaveLength(3);
      expect(slices[0].label).toBe('LB02');
      expect(Math.round(slices[0].percent)).toBe(41);
      expect(slices[1].label).toBe('Remaining Quota');
      expect(Math.round(slices[1].percent)).toBe(32);
      expect(slices[2].label).toBe('LB01');
      expect(Math.round(slices[2].percent)).toBe(27);
    });
  });

  describe('isRuleVisible and isViewportVisible', () => {
    const frame = toDataFrame({
      fields: [{ name: 'group_enabled', type: FieldType.string, values: ['true'] }],
    });
    const vars: Record<string, string> = { '$well_mode': 'group', '$region': 'Bavaria' };
    const replace = (input: string) => vars[input] ?? input;

    it('evaluates variable, field, and viewport visibility rules', () => {
      expect(
        isRuleVisible(
          { enabled: true, source: 'variable', target: '$well_mode', operator: 'equals', value: 'group' },
          [frame],
          defaultOptions,
          replace
        )
      ).toBe(true);

      expect(
        isRuleVisible(
          { enabled: true, source: 'variable', target: 'well_mode', operator: 'equals', value: 'single' },
          [frame],
          defaultOptions,
          replace
        )
      ).toBe(false);

      expect(
        isRuleVisible(
          { enabled: true, source: 'field', target: 'group_enabled', operator: 'equals', value: 'true' },
          [frame],
          defaultOptions,
          replace
        )
      ).toBe(true);

      expect(isViewportVisible('desktopOnly', false)).toBe(true);
      expect(isViewportVisible('desktopOnly', true)).toBe(false);
      expect(isViewportVisible('mobileOnly', true)).toBe(true);
    });
  });
});

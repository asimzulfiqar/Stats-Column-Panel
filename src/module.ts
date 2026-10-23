import { PanelPlugin } from '@grafana/data';
import { ColumnsEditor } from './components/ColumnsEditor';
import { FieldSelectorEditor } from './components/FieldSelectorEditor';
import { StatsColumnPanel } from './components/StatsColumnPanel';
import { StatsColumnOptions } from './types';
import { columnTemplates } from './utils';

export const plugin = new PanelPlugin<StatsColumnOptions>(StatsColumnPanel).setPanelOptions((builder) =>
  builder
    .addCustomEditor({
      id: 'columns',
      path: 'columns',
      name: 'Columns & Stat items',
      category: ['Columns & Stats'],
      description: 'Configure vertical columns of Stat cards and headings that stay grouped together on mobile and desktop.',
      editor: ColumnsEditor,
      defaultValue: columnTemplates.telemetryOverview,
    })
    .addSelect({
      path: 'numberFormat',
      name: 'Default number format',
      category: ['Formatting & Stat Defaults'],
      description: 'Formatting style for numbers (can be overridden per stat box).',
      defaultValue: 'de-grouped',
      settings: {
        options: [
          { label: 'German grouped (10.000,56 / 5,62)', value: 'de-grouped' },
          { label: 'English grouped (10,000.56 / 5.62)', value: 'en-grouped' },
          { label: 'Plain dot (10000.56 / 5.62)', value: 'en-plain' },
          { label: 'Plain comma (10000,56 / 5,62)', value: 'de-plain' },
        ],
      },
    })
    .addSelect({
      path: 'defaultCalculation',
      name: 'Default calculation',
      category: ['Formatting & Stat Defaults'],
      description: 'How to reduce multiple rows when a stat box does not specify its own calculation.',
      defaultValue: 'lastNotNull',
      settings: {
        options: [
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
        ],
      },
    })
    .addSelect({
      path: 'defaultColorMode',
      name: 'Default color mode',
      category: ['Formatting & Stat Defaults'],
      defaultValue: 'value',
      settings: {
        options: [
          { label: 'Value text color', value: 'value' },
          { label: 'Solid background color', value: 'background' },
          { label: 'Gradient background color', value: 'background-gradient' },
          { label: 'Neutral (no color)', value: 'none' },
        ],
      },
    })
    .addSelect({
      path: 'defaultBaseColor',
      name: 'Default base color',
      category: ['Formatting & Stat Defaults'],
      defaultValue: 'green',
      settings: {
        options: [
          { label: 'Green', value: 'green' },
          { label: 'Light Blue', value: 'light-blue' },
          { label: 'Blue', value: 'blue' },
          { label: 'Yellow', value: 'yellow' },
          { label: 'Orange', value: 'orange' },
          { label: 'Red', value: 'red' },
          { label: 'Purple', value: 'purple' },
          { label: 'White / Primary', value: 'white' },
          { label: 'Gray / Muted', value: 'gray' },
        ],
      },
    })
    .addTextInput({
      path: 'defaultNoValueText',
      name: 'No-value fallback text',
      category: ['Formatting & Stat Defaults'],
      defaultValue: '-',
    })
    .addCustomEditor({
      id: 'selectorField',
      path: 'selectorField',
      name: 'Row selector field',
      category: ['Row Selection'],
      description: 'Used when calculation is set to "Selected row". Matches a row by field value (e.g. device_id).',
      editor: FieldSelectorEditor,
    })
    .addTextInput({
      path: 'selectorValue',
      name: 'Row selector value',
      category: ['Row Selection'],
      description: 'Supports Grafana variables, for example $device_id.',
      defaultValue: '',
    })
    .addNumberInput({
      path: 'rowIndex',
      name: 'Row index fallback',
      category: ['Row Selection'],
      defaultValue: 0,
      settings: { min: 0 },
    })
    .addBooleanSwitch({
      path: 'enableInteractiveResize',
      name: 'Enable drag-to-resize on items',
      category: ['Layout & Typography'],
      description: 'Drag the bottom edge, right edge, or bottom-right corner of any card in the panel to resize its height and width interactively.',
      defaultValue: true,
    })
    .addNumberInput({
      path: 'maxColumns',
      name: 'Maximum desktop columns',
      category: ['Layout & Typography'],
      description: 'Maximum number of columns displayed side-by-side on wide screens.',
      defaultValue: 2,
      settings: { min: 1, max: 8 },
    })
    .addNumberInput({
      path: 'minColumnWidth',
      name: 'Minimum column width (px)',
      category: ['Layout & Typography'],
      description: 'When the panel narrows below this width per column (e.g. on mobile), columns stack vertically while keeping each column intact.',
      defaultValue: 260,
      settings: { min: 140, max: 800 },
    })
    .addNumberInput({
      path: 'columnGap',
      name: 'Column gap (px)',
      category: ['Layout & Typography'],
      defaultValue: 12,
      settings: { min: 0, max: 48 },
    })
    .addNumberInput({
      path: 'rowGap',
      name: 'Vertical card gap (px)',
      category: ['Layout & Typography'],
      defaultValue: 12,
      settings: { min: 0, max: 48 },
    })
    .addNumberInput({
      path: 'cardMinHeight',
      name: 'Stat card min height (px)',
      category: ['Layout & Typography'],
      defaultValue: 130,
      settings: { min: 72, max: 400 },
    })
    .addNumberInput({
      path: 'titleFontSize',
      name: 'Stat title font size (px)',
      category: ['Layout & Typography'],
      defaultValue: 15,
      settings: { min: 11, max: 32 },
    })
    .addNumberInput({
      path: 'valueFontSize',
      name: 'Stat value font size (px)',
      category: ['Layout & Typography'],
      defaultValue: 48,
      settings: { min: 18, max: 96 },
    })
    .addNumberInput({
      path: 'headingFontSize',
      name: 'Section heading font size (px)',
      category: ['Layout & Typography'],
      defaultValue: 26,
      settings: { min: 14, max: 56 },
    })
    .addRadio({
      path: 'valueAlign',
      name: 'Value alignment',
      category: ['Layout & Typography'],
      defaultValue: 'center',
      settings: {
        options: [
          { label: 'Left', value: 'left' },
          { label: 'Center', value: 'center' },
          { label: 'Right', value: 'right' },
        ],
      },
    })
    .addRadio({
      path: 'cardBorder',
      name: 'Card border',
      category: ['Layout & Typography'],
      defaultValue: 'subtle',
      settings: {
        options: [
          { label: 'None', value: 'none' },
          { label: 'Subtle', value: 'subtle' },
          { label: 'Strong', value: 'strong' },
        ],
      },
    })
    .addRadio({
      path: 'cardRadius',
      name: 'Card corner radius',
      category: ['Layout & Typography'],
      defaultValue: 'medium',
      settings: {
        options: [
          { label: 'Small', value: 'small' },
          { label: 'Medium', value: 'medium' },
          { label: 'Large', value: 'large' },
        ],
      },
    })
);


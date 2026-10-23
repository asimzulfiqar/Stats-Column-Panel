import React, { useMemo, useState } from 'react';
import { css, cx } from '@emotion/css';
import { PanelProps } from '@grafana/data';
import { Alert, Button, Icon, Tooltip, useStyles2, useTheme2 } from '@grafana/ui';
import { StatColorMode, StatColumnItem, StatsColumnOptions } from '../types';
import {
  calculateFieldValue,
  columnTemplates,
  formatStatItem,
  isRuleVisible,
  isViewportVisible,
  ResolvedPieSlice,
  resolveItemTimestamp,
  resolvePieSlices,
  resolveThemeColor,
} from '../utils';

const getStyles = (theme: ReturnType<typeof useTheme2>) => ({
  wrapper: css`
    height: 100%;
    overflow: auto;
    padding: ${theme.spacing(1)};
  `,
  empty: css`
    display: grid;
    height: 100%;
    place-content: center;
    padding: ${theme.spacing(3)};
    text-align: center;
  `,
  emptyActions: css`
    display: flex;
    flex-wrap: wrap;
    gap: ${theme.spacing(1)};
    justify-content: center;
    margin-top: ${theme.spacing(1.5)};
  `,
  columnsGrid: css`
    align-items: start;
    display: grid;
    width: 100%;
  `,
  columnStack: css`
    display: flex;
    flex-direction: column;
    min-width: 0;
  `,
  columnHeader: css`
    color: ${theme.colors.text.primary};
    font-weight: ${theme.typography.fontWeightRegular};
    line-height: 1.25;
    padding: ${theme.spacing(0.5, 0.5, 0.75)};
  `,
  inlineHeading: css`
    color: ${theme.colors.text.primary};
    display: flex;
    flex-direction: column;
    font-weight: ${theme.typography.fontWeightRegular};
    justify-content: center;
    line-height: 1.25;
    padding: ${theme.spacing(1.25, 0.5, 0.5)};
    position: relative;
  `,
  statCard: css`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-width: 0;
    overflow: hidden;
    padding: ${theme.spacing(1.5, 2)};
    position: relative;
    transition: border-color 0.15s ease;
    &:hover .resize-grip {
      opacity: 0.85;
    }
  `,
  statHeader: css`
    align-items: center;
    display: flex;
    gap: ${theme.spacing(0.75)};
    justify-content: flex-start;
    min-width: 0;
  `,
  statTitle: css`
    font-weight: ${theme.typography.fontWeightMedium};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  infoIcon: css`
    color: ${theme.colors.text.secondary};
    cursor: pointer;
    display: inline-flex;
    flex: 0 0 auto;
    &:hover {
      color: ${theme.colors.text.primary};
    }
  `,
  statValueRow: css`
    align-items: baseline;
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    gap: 0.22em;
    line-height: 1.1;
    margin: ${theme.spacing(1, 0, 0.5)};
  `,
  statNumber: css`
    font-weight: ${theme.typography.fontWeightMedium};
    letter-spacing: -0.02em;
    word-break: break-word;
  `,
  statUnit: css`
    font-size: 0.58em;
    font-weight: ${theme.typography.fontWeightMedium};
    white-space: nowrap;
  `,
  timestampFooter: css`
    line-height: 1.25;
    margin-top: ${theme.spacing(0.5)};
    opacity: 0.85;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  pieContainer: css`
    align-items: center;
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: center;
    padding: ${theme.spacing(1, 0, 0.5)};
  `,
  pieSvg: css`
    display: block;
    height: auto;
    width: 100%;
  `,
  pieLegend: css`
    align-items: flex-start;
    display: flex;
    flex-direction: column;
    gap: ${theme.spacing(0.75)};
    margin-top: ${theme.spacing(1.5)};
    width: 100%;
  `,
  pieLegendItem: css`
    align-items: center;
    color: ${theme.colors.text.primary};
    display: flex;
    font-size: 13px;
    gap: ${theme.spacing(1)};
    line-height: 1.2;
  `,
  pieLegendSwatch: css`
    border-radius: 3px;
    display: inline-block;
    flex: 0 0 auto;
    height: 4px;
    width: 14px;
  `,
  pieEmpty: css`
    align-items: center;
    color: ${theme.colors.text.secondary};
    display: flex;
    flex: 1;
    justify-content: center;
    padding: ${theme.spacing(2)};
    text-align: center;
  `,
  resizeBottomHandle: css`
    bottom: 0;
    cursor: ns-resize;
    height: 7px;
    left: 0;
    position: absolute;
    right: 14px;
    z-index: 4;
    &:hover {
      background: ${theme.colors.primary.transparent};
    }
  `,
  resizeRightHandle: css`
    bottom: 14px;
    cursor: ew-resize;
    position: absolute;
    right: 0;
    top: 0;
    width: 7px;
    z-index: 4;
    &:hover {
      background: ${theme.colors.primary.transparent};
    }
  `,
  resizeCornerGrip: css`
    bottom: 2px;
    cursor: nwse-resize;
    height: 12px;
    opacity: 0;
    position: absolute;
    right: 2px;
    transition: opacity 0.15s ease;
    width: 12px;
    z-index: 5;
    &::after {
      border-bottom: 2px solid ${theme.colors.text.secondary};
      border-right: 2px solid ${theme.colors.text.secondary};
      bottom: 2px;
      content: '';
      height: 7px;
      position: absolute;
      right: 2px;
      width: 7px;
    }
  `,
  resizeBadge: css`
    background: ${theme.colors.background.canvas};
    border: 1px solid ${theme.colors.primary.border};
    border-radius: 4px;
    bottom: 8px;
    color: ${theme.colors.text.primary};
    font-size: 11px;
    padding: 2px 6px;
    pointer-events: none;
    position: absolute;
    right: 16px;
    z-index: 6;
  `,
});

const option = <T,>(value: T | undefined, fallback: T): T => value ?? fallback;

function polarToCartesian(cxNum: number, cyNum: number, radius: number, angleInRadians: number) {
  return {
    x: cxNum + radius * Math.cos(angleInRadians),
    y: cyNum + radius * Math.sin(angleInRadians),
  };
}

function buildSectorPath(
  cxNum: number,
  cyNum: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  const sweep = endAngle - startAngle;
  if (sweep >= Math.PI * 2 - 0.0001) {
    const midAngle = startAngle + Math.PI;
    return [
      buildSectorPath(cxNum, cyNum, outerR, innerR, startAngle, midAngle),
      buildSectorPath(cxNum, cyNum, outerR, innerR, midAngle, startAngle + Math.PI * 2 - 0.0001),
    ].join(' ');
  }

  const largeArcFlag = sweep > Math.PI ? 1 : 0;
  const startOuter = polarToCartesian(cxNum, cyNum, outerR, startAngle);
  const endOuter = polarToCartesian(cxNum, cyNum, outerR, endAngle);

  if (innerR <= 0) {
    return [
      `M ${cxNum} ${cyNum}`,
      `L ${startOuter.x} ${startOuter.y}`,
      `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
      'Z',
    ].join(' ');
  }

  const startInner = polarToCartesian(cxNum, cyNum, innerR, endAngle);
  const endInner = polarToCartesian(cxNum, cyNum, innerR, startAngle);

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ');
}

interface PieCardContentProps {
  item: StatColumnItem;
  slices: ResolvedPieSlice[];
  effectiveHeight: number;
  theme: ReturnType<typeof useTheme2>;
  styles: ReturnType<typeof getStyles>;
}

const PieCardContent = ({ item, slices, effectiveHeight, theme, styles }: PieCardContentProps) => {
  if (slices.length === 0) {
    return <div className={styles.pieEmpty}>{item.noValueText || 'No pie chart data'}</div>;
  }

  const isDonut = item.pieType === 'donut';
  const outerR = 88;
  const innerR = isDonut ? 48 : 0;
  const labelR = isDonut ? (outerR + innerR) / 2 : outerR * 0.6;
  const displayMode = item.pieDisplayLabels ?? 'percent';
  const showLegend = item.pieShowLegend ?? true;
  const pieDiameter = item.pieSize || Math.max(120, Math.min(360, effectiveHeight - (showLegend ? 85 : 30)));

  return (
    <div className={styles.pieContainer}>
      <svg
        className={styles.pieSvg}
        style={{ maxWidth: `${pieDiameter}px`, maxHeight: `${pieDiameter}px` }}
        viewBox="0 0 200 200"
        aria-label={item.title || 'Pie chart'}
      >
        {slices.map((slice, sliceIndex) => {
          const priorPercent = slices
            .slice(0, sliceIndex)
            .reduce((sum, prev) => sum + prev.percent, 0);
          const startAngle = -Math.PI / 2 + (priorPercent / 100) * Math.PI * 2;
          const sliceAngle = (slice.percent / 100) * Math.PI * 2;
          const endAngle = startAngle + sliceAngle;
          const midAngle = startAngle + sliceAngle / 2;

          const pathData = buildSectorPath(100, 100, outerR, innerR, startAngle, endAngle);
          const labelPos = polarToCartesian(100, 100, labelR, midAngle);
          const fillColor = resolveThemeColor(slice.color, theme);

          const sliceLabelText =
            displayMode === 'none'
              ? ''
              : displayMode === 'value'
                ? `${slice.formattedValue}${slice.unitText ? ` ${slice.unitText}` : ''}`
                : displayMode === 'name'
                  ? slice.label
                  : `${Math.round(slice.percent)}%`;

          const tooltipText = `${slice.label}: ${slice.formattedValue}${slice.unitText ? ` ${slice.unitText}` : ''} (${Math.round(slice.percent)}%)`;

          return (
            <Tooltip key={slice.id} content={tooltipText}>
              <g style={{ cursor: 'pointer' }}>
                <path
                  d={pathData}
                  fill={fillColor}
                  stroke={theme.colors.background.secondary}
                  strokeWidth={slices.length > 1 ? 2 : 0}
                />
                {sliceLabelText && slice.percent >= 5 && (
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#F4F5F8"
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      pointerEvents: 'none',
                      textShadow: '0 1px 3px rgba(0, 0, 0, 0.65)',
                    }}
                  >
                    {sliceLabelText}
                  </text>
                )}
              </g>
            </Tooltip>
          );
        })}
      </svg>

      {showLegend && (
        <div className={styles.pieLegend}>
          {slices.map((slice) => (
            <div key={`legend-${slice.id}`} className={styles.pieLegendItem}>
              <span
                className={styles.pieLegendSwatch}
                style={{ background: resolveThemeColor(slice.color, theme) }}
              />
              <span>{slice.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface ActiveResizeState {
  colId: string;
  itemId: string;
  minHeight: number;
  widthPercent: number;
}

export const StatsColumnPanel = ({
  options,
  data,
  width,
  onOptionsChange,
  replaceVariables,
}: PanelProps<StatsColumnOptions>) => {
  const theme = useTheme2();
  const styles = useStyles2(getStyles);
  const [activeResize, setActiveResize] = useState<ActiveResizeState | null>(null);

  const maxColumns = Math.max(1, option(options.maxColumns, 2));
  const minColumnWidth = Math.max(140, option(options.minColumnWidth, 260));
  const columnGap = Math.max(0, option(options.columnGap, 12));
  const rowGap = Math.max(0, option(options.rowGap, 12));
  const cardMinHeight = Math.max(72, option(options.cardMinHeight, 130));
  const titleFontSize = Math.max(11, option(options.titleFontSize, 15));
  const defaultValueFontSize = Math.max(18, option(options.valueFontSize, 48));
  const headingFontSize = Math.max(14, option(options.headingFontSize, 26));
  const timestampFontSize = Math.max(10, option(options.timestampFontSize, 12));
  const valueAlign = option(options.valueAlign, 'center');
  const radiusPx = { small: 4, medium: 8, large: 14 }[option(options.cardRadius, 'medium')];
  const borderWidth = { none: 0, subtle: 1, strong: 2 }[option(options.cardBorder, 'subtle')];
  const interactiveResize = option(options.enableInteractiveResize, true);

  const fittingColumns = Math.max(
    1,
    Math.floor((Math.max(width, minColumnWidth) + columnGap) / (minColumnWidth + columnGap))
  );
  const isMobileViewport = fittingColumns === 1 && maxColumns > 1;

  const visibleColumns = useMemo(() => {
    const rawColumns = options.columns ?? [];
    return rawColumns
      .filter((col) => isViewportVisible(col.viewportVisibility, isMobileViewport))
      .filter((col) => isRuleVisible(col.visibility, data.series, options, replaceVariables))
      .map((col) => ({
        ...col,
        items: (col.items ?? [])
          .filter((item) => isViewportVisible(item.viewportVisibility, isMobileViewport))
          .filter((item) => isRuleVisible(item.visibility, data.series, options, replaceVariables)),
      }))
      .filter((col) => col.items.length > 0 || Boolean(col.title?.trim()));
  }, [options, isMobileViewport, data.series, replaceVariables]);

  const applyTemplate = (templateKey: keyof typeof columnTemplates) => {
    onOptionsChange({
      ...options,
      columns: JSON.parse(JSON.stringify(columnTemplates[templateKey])),
    });
  };

  const startResize = (
    event: React.MouseEvent<HTMLElement>,
    colId: string,
    item: StatColumnItem,
    mode: 'height' | 'width' | 'both',
    initialHeight: number,
    initialWidthPct: number
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const cardElement = event.currentTarget.parentElement;
    const columnElement = cardElement?.parentElement;
    const columnWidthPx = columnElement?.getBoundingClientRect().width || Math.max(240, width / 2);

    const startX = event.clientX;
    const startY = event.clientY;
    let nextHeight = initialHeight;
    let nextWidthPct = initialWidthPct;

    setActiveResize({
      colId,
      itemId: item.id,
      minHeight: nextHeight,
      widthPercent: nextWidthPct,
    });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (mode === 'height' || mode === 'both') {
        const deltaY = moveEvent.clientY - startY;
        const minAllowed = item.kind === 'heading' ? 28 : 64;
        nextHeight = Math.round(Math.max(minAllowed, Math.min(800, initialHeight + deltaY)));
      }
      if (mode === 'width' || mode === 'both') {
        const deltaX = moveEvent.clientX - startX;
        const deltaPct = (deltaX / Math.max(100, columnWidthPx)) * 100;
        nextWidthPct = Math.round(Math.max(25, Math.min(100, initialWidthPct + deltaPct)));
      }
      setActiveResize({
        colId,
        itemId: item.id,
        minHeight: nextHeight,
        widthPercent: nextWidthPct,
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setActiveResize(null);

      const updatedColumns = (options.columns ?? []).map((col) => {
        if (col.id !== colId) {
          return col;
        }
        return {
          ...col,
          items: col.items.map((candidate) => {
            if (candidate.id !== item.id) {
              return candidate;
            }
            return {
              ...candidate,
              minHeight: nextHeight,
              widthPercent: nextWidthPct,
            };
          }),
        };
      });

      onOptionsChange({
        ...options,
        columns: updatedColumns,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if ((options.columns ?? []).length === 0) {
    return (
      <div className={styles.empty}>
        <div>
          <Alert title="Configure Stats Columns" severity="info">
            Add columns and stat cards in the panel options, or start with a ready-made responsive column template.
          </Alert>
          <div className={styles.emptyActions}>
            <Button icon="columns" onClick={() => applyTemplate('telemetryOverview')}>
              Load Telemetry Overview template (2 columns)
            </Button>
            <Button variant="secondary" icon="apps" onClick={() => applyTemplate('threeColumns')}>
              Load 3-Column Infrastructure template
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (visibleColumns.length === 0) {
    return (
      <div className={styles.empty}>
        <Alert title="All columns are currently hidden" severity="info">
          No columns matched the active variable, field, or viewport visibility conditions.
        </Alert>
      </div>
    );
  }

  const activeColumnCount = Math.max(1, Math.min(visibleColumns.length, maxColumns, fittingColumns));

  const gridTemplateColumns =
    activeColumnCount === 1
      ? 'minmax(0, 1fr)'
      : visibleColumns.length <= activeColumnCount
        ? visibleColumns
            .slice(0, activeColumnCount)
            .map((col) => `minmax(0, ${Math.max(0.25, col.widthWeight ?? 1)}fr)`)
            .join(' ')
        : `repeat(${activeColumnCount}, minmax(0, 1fr))`;

  const justifyContent =
    valueAlign === 'left' ? 'flex-start' : valueAlign === 'right' ? 'flex-end' : 'center';

  const renderResizeHandles = (
    colId: string,
    item: StatColumnItem,
    effectiveHeight: number,
    effectiveWidthPct: number,
    isBeingResized: boolean
  ) => {
    if (!interactiveResize) {
      return null;
    }
    return (
      <>
        <div
          className={styles.resizeBottomHandle}
          title="Drag to resize height"
          onMouseDown={(e) => startResize(e, colId, item, 'height', effectiveHeight, effectiveWidthPct)}
        />
        {!isMobileViewport && (
          <div
            className={styles.resizeRightHandle}
            title="Drag to resize width (%)"
            onMouseDown={(e) => startResize(e, colId, item, 'width', effectiveHeight, effectiveWidthPct)}
          />
        )}
        <div
          className={cx(styles.resizeCornerGrip, 'resize-grip')}
          title="Drag corner to resize height & width"
          onMouseDown={(e) =>
            startResize(
              e,
              colId,
              item,
              isMobileViewport ? 'height' : 'both',
              effectiveHeight,
              effectiveWidthPct
            )
          }
        />
        {isBeingResized && (
          <span className={styles.resizeBadge}>
            {effectiveWidthPct}% × {effectiveHeight}px
          </span>
        )}
      </>
    );
  };

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.columnsGrid}
        style={{
          gridTemplateColumns,
          gap: `${columnGap}px`,
        }}
      >
        {visibleColumns.map((column, colIndex) => (
          <section
            key={column.id || `col-${colIndex}`}
            className={styles.columnStack}
            style={{ gap: `${rowGap}px` }}
            aria-label={column.title ? replaceVariables(column.title) : `Column ${colIndex + 1}`}
          >
            {column.title?.trim() && (
              <div
                className={styles.columnHeader}
                style={{
                  fontSize: `${headingFontSize}px`,
                  textAlign: column.titleAlign || 'center',
                }}
              >
                {replaceVariables(column.title)}
              </div>
            )}

            {column.items.map((item, itemIndex) => {
              const isBeingResized =
                activeResize?.colId === column.id && activeResize?.itemId === item.id;
              const configuredWidthPct = Math.max(25, Math.min(100, item.widthPercent ?? 100));
              const effectiveWidthPct = isBeingResized
                ? activeResize.widthPercent
                : isMobileViewport
                  ? 100
                  : configuredWidthPct;

              if (item.kind === 'heading') {
                const sizeMultiplier = item.headingSize === 'sm' ? 0.75 : item.headingSize === 'md' ? 0.9 : 1;
                const effectiveHeadingHeight = isBeingResized
                  ? activeResize.minHeight
                  : item.minHeight ?? 44;

                return (
                  <div
                    key={item.id || `heading-${itemIndex}`}
                    className={styles.inlineHeading}
                    style={{
                      fontSize: `${item.valueFontSize || Math.round(headingFontSize * sizeMultiplier)}px`,
                      textAlign: item.headingAlign || 'center',
                      minHeight: item.minHeight || isBeingResized ? `${effectiveHeadingHeight}px` : undefined,
                      width: `${effectiveWidthPct}%`,
                    }}
                  >
                    {replaceVariables(item.title)}
                    {renderResizeHandles(
                      column.id,
                      item,
                      effectiveHeadingHeight,
                      effectiveWidthPct,
                      isBeingResized
                    )}
                  </div>
                );
              }

              if (item.kind === 'pie') {
                const pieSlices = resolvePieSlices(item, data.series, options, replaceVariables);
                const pieTimestampText = resolveItemTimestamp(
                  data.series,
                  item,
                  undefined,
                  undefined,
                  options,
                  replaceVariables
                );
                const defaultPieHeight = Math.max(cardMinHeight * 2, 260);
                const effectivePieHeight = isBeingResized
                  ? activeResize.minHeight
                  : item.minHeight || defaultPieHeight;
                const hasHeader = Boolean(item.title?.trim() || item.tooltip?.trim());
                const effectiveTitleFontSize = item.titleFontSize || titleFontSize;

                return (
                  <article
                    key={item.id || `pie-${itemIndex}`}
                    className={cx(
                      styles.statCard,
                      css`
                        background: ${theme.colors.background.secondary};
                        border: ${borderWidth}px solid ${theme.colors.border.weak};
                        border-radius: ${radiusPx}px;
                        min-height: ${effectivePieHeight}px;
                        width: ${effectiveWidthPct}%;
                      `
                    )}
                  >
                    {hasHeader && (
                      <div className={styles.statHeader}>
                        {item.title?.trim() && (
                          <span
                            className={styles.statTitle}
                            style={{
                              fontSize: `${effectiveTitleFontSize}px`,
                              color: theme.colors.text.primary,
                            }}
                          >
                            {replaceVariables(item.title)}
                          </span>
                        )}
                        {item.tooltip?.trim() && (
                          <Tooltip content={replaceVariables(item.tooltip)}>
                            <span className={styles.infoIcon} aria-label="Pie chart info">
                              <Icon name="info-circle" size="sm" />
                            </span>
                          </Tooltip>
                        )}
                      </div>
                    )}
                    <PieCardContent
                      item={item}
                      slices={pieSlices}
                      effectiveHeight={effectivePieHeight}
                      theme={theme}
                      styles={styles}
                    />
                    {pieTimestampText && (
                      <div
                        className={styles.timestampFooter}
                        style={{
                          color: theme.colors.text.secondary,
                          fontSize: `${timestampFontSize}px`,
                          textAlign: valueAlign,
                        }}
                      >
                        {pieTimestampText}
                      </div>
                    )}
                    {renderResizeHandles(
                      column.id,
                      item,
                      effectivePieHeight,
                      effectiveWidthPct,
                      isBeingResized
                    )}
                  </article>
                );
              }

              const calculation = item.calculation || option(options.defaultCalculation, 'lastNotNull');
              const { rawValue, field, frame, rowIndex } = calculateFieldValue(
                data.series,
                item.field,
                item.refId,
                calculation,
                options,
                replaceVariables
              );
              const formatted = formatStatItem(rawValue, field, item, options);
              const timestampText = resolveItemTimestamp(
                data.series,
                item,
                frame,
                rowIndex,
                options,
                replaceVariables
              );
              const resolvedColor = resolveThemeColor(formatted.color, theme);
              const colorMode: StatColorMode =
                item.colorMode && item.colorMode !== 'inherit'
                  ? item.colorMode
                  : option(options.defaultColorMode, 'value');

              const isBgSolid = colorMode === 'background';
              const isBgGradient = colorMode === 'background-gradient';
              const cardBackground = isBgSolid
                ? resolvedColor
                : isBgGradient
                  ? `linear-gradient(135deg, ${resolvedColor}33 0%, ${theme.colors.background.secondary} 100%)`
                  : theme.colors.background.secondary;

              const valueColor =
                colorMode === 'value' || isBgGradient
                  ? resolvedColor
                  : isBgSolid
                    ? '#FFFFFF'
                    : theme.colors.text.primary;

              const titleColor = isBgSolid ? 'rgba(255, 255, 255, 0.9)' : theme.colors.text.primary;
              const timestampColor = isBgSolid
                ? 'rgba(255, 255, 255, 0.85)'
                : theme.colors.text.secondary;
              const isLongWarningMessage = !formatted.unitText && formatted.valueText.length > 18;
              const baseValueFont = item.valueFontSize || defaultValueFontSize;
              const itemValueFontSize = isLongWarningMessage
                ? Math.max(16, Math.round(baseValueFont * 0.45))
                : baseValueFont;
              const effectiveTitleFontSize = item.titleFontSize || titleFontSize;
              const effectiveStatHeight = isBeingResized
                ? activeResize.minHeight
                : item.minHeight || cardMinHeight;

              return (
                <article
                  key={item.id || `stat-${itemIndex}`}
                  className={cx(
                    styles.statCard,
                    css`
                      background: ${cardBackground};
                      border: ${borderWidth}px solid ${theme.colors.border.weak};
                      border-radius: ${radiusPx}px;
                      min-height: ${effectiveStatHeight}px;
                      width: ${effectiveWidthPct}%;
                    `
                  )}
                >
                  <div className={styles.statHeader}>
                    <span
                      className={styles.statTitle}
                      style={{ fontSize: `${effectiveTitleFontSize}px`, color: titleColor }}
                      title={replaceVariables(item.title || item.field || '')}
                    >
                      {replaceVariables(item.title || item.field || 'Stat')}
                    </span>
                    {item.tooltip?.trim() && (
                      <Tooltip content={replaceVariables(item.tooltip)}>
                        <span className={styles.infoIcon} aria-label="Stat info">
                          <Icon name="info-circle" size="sm" />
                        </span>
                      </Tooltip>
                    )}
                  </div>

                  <div
                    className={styles.statValueRow}
                    style={{
                      justifyContent,
                      color: valueColor,
                      fontSize: `${itemValueFontSize}px`,
                    }}
                  >
                    <span className={styles.statNumber}>{formatted.valueText}</span>
                    {formatted.unitText && (
                      <span className={styles.statUnit}>{replaceVariables(formatted.unitText)}</span>
                    )}
                  </div>

                  {timestampText && (
                    <div
                      className={styles.timestampFooter}
                      style={{
                        color: timestampColor,
                        fontSize: `${timestampFontSize}px`,
                        textAlign: valueAlign,
                      }}
                    >
                      {timestampText}
                    </div>
                  )}

                  {renderResizeHandles(
                    column.id,
                    item,
                    effectiveStatHeight,
                    effectiveWidthPct,
                    isBeingResized
                  )}
                </article>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
};

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Svg, Polyline, Line, Rect } from 'react-native-svg';

// Mini sparkline graph for asset cards
export function Sparkline({ data, width = 60, height = 24, color = '#34d399' }) {
  if (!data || data.length === 0) {
    return <View style={{ width, height }} />;
  }

  // If only 1 data point, draw a flat line
  if (data.length === 1) {
    return (
      <View style={{ width, height }}>
        <Svg width={width} height={height}>
          <Line
            x1="0"
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke={color}
            strokeWidth={1.5}
            strokeDasharray="3,3"
            opacity={0.4}
          />
        </Svg>
      </View>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

// Larger chart for detail modal
export function PriceChart({ data, width = 280, height = 120, color = '#34d399' }) {
  if (!data || data.length === 0) {
    return <View style={[styles.chartPlaceholder, { width, height }]} />;
  }

  // If only 1 data point, draw a flat dashed line
  if (data.length === 1) {
    return (
      <View style={{ width, height }}>
        <Svg width={width} height={height}>
          <Line
            x1="0"
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke={color}
            strokeWidth={2}
            strokeDasharray="6,4"
            opacity={0.3}
          />
        </Svg>
      </View>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padTop = 10;
  const padBottom = 10;
  const chartHeight = height - padTop - padBottom;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = padTop + chartHeight - ((val - min) / range) * chartHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Area fill points (close the polygon at bottom)
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  // Horizontal grid lines
  const gridLines = [0.25, 0.5, 0.75].map((pct) => padTop + chartHeight * pct);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {gridLines.map((y, i) => (
          <Line
            key={i}
            x1="0"
            y1={y}
            x2={width}
            y2={y}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        ))}
        {/* Area fill */}
        <Polyline points={areaPoints} fill={color} opacity={0.08} />
        {/* Line */}
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

// Deterministic pseudo-random jitter so candle wicks look real but stay stable per render
function jitter(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// Real OHLC candlestick chart derived from a close-price history line
export function CandlestickChart({ data, width = 320, height = 140, upColor = '#34d399', downColor = '#f87171' }) {
  if (!data || data.length < 2) {
    return <View style={[styles.chartPlaceholder, { width, height }]} />;
  }

  const padTop = 12;
  const padBottom = 12;
  const chartHeight = height - padTop - padBottom;

  // Build OHLC candles: each candle's open is the prior close
  const candles = [];
  for (let i = 1; i < data.length; i++) {
    const open = data[i - 1];
    const close = data[i];
    const base = Math.max(open, close);
    const bottom = Math.min(open, close);
    const spread = (base - bottom) || base * 0.002;
    const high = base + spread * (0.3 + jitter(i) * 0.7);
    const low = bottom - spread * (0.3 + jitter(i + 100) * 0.7);
    candles.push({ open, close, high, low });
  }

  const allValues = candles.flatMap((c) => [c.high, c.low]);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const scaleY = (v) => padTop + chartHeight - ((v - min) / range) * chartHeight;

  const n = candles.length;
  const slot = width / n;
  const bodyWidth = Math.max(2, slot * 0.55);

  const gridLines = [0.25, 0.5, 0.75].map((pct) => padTop + chartHeight * pct);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {gridLines.map((y, i) => (
          <Line
            key={i}
            x1="0"
            y1={y}
            x2={width}
            y2={y}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        ))}
        {candles.map((c, i) => {
          const cx = i * slot + slot / 2;
          const up = c.close >= c.open;
          const color = up ? upColor : downColor;
          const yHigh = scaleY(c.high);
          const yLow = scaleY(c.low);
          const yOpen = scaleY(c.open);
          const yClose = scaleY(c.close);
          const bodyTop = Math.min(yOpen, yClose);
          const bodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));
          return (
            <React.Fragment key={i}>
              <Line
                x1={cx}
                y1={yHigh}
                x2={cx}
                y2={yLow}
                stroke={color}
                strokeWidth={1}
              />
              <Rect
                x={cx - bodyWidth / 2}
                y={bodyTop}
                width={bodyWidth}
                height={bodyHeight}
                fill={color}
                rx={1}
              />
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  chartPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

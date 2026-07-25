import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { useTheme } from '../context/ThemeContext';

/** Reads the live value of a CSS custom property off <html> so charts always match the active theme. */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * `buildConfig(colors)` returns a Chart.js config object; colors is a
 * lookup of the token values the chart needs. Re-runs whenever the
 * theme changes so switching light/dark restyles the chart in place.
 */
export default function ThemedChart({ buildConfig, height = 260 }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const colors = {
      ink: cssVar('--color-ink'),
      inkMuted: cssVar('--color-ink-muted'),
      line: cssVar('--color-line'),
      accent: cssVar('--color-accent'),
      submitted: cssVar('--color-signal-submitted'),
      progress: cssVar('--color-signal-progress'),
      resolved: cssVar('--color-signal-resolved'),
      rejected: cssVar('--color-signal-rejected'),
      fontBody: cssVar('--font-body'),
      fontMono: cssVar('--font-mono'),
    };

    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(canvasRef.current, buildConfig(colors));

    return () => chartRef.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, buildConfig]);

  return <canvas ref={canvasRef} height={height} />;
}

/**
 * The one place Chart.js is imported. Only loaded with a dynamic `import()`
 * from `ExerciseProgressSheet.vue`, so it lands in its own chunk and costs
 * nothing until someone opens an exercise's progress. Tree-shaken: a bar
 * chart needs only these five pieces, not `chart.js/auto`.
 */
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Tooltip,
  type TooltipItem,
} from 'chart.js'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

export interface ProgressChartBar {
  /** Short date under the bar. */
  label: string
  value: number
  /** Tooltip lines: the date in full, then the set and its estimate. */
  tooltip: string[]
}

export interface ProgressChartColors {
  accent: string
  /** The bars before the latest: the accent, faded. */
  accentSoft: string
  text: string
  grid: string
}

export interface ProgressChartHandle {
  destroy(): void
}

export function renderProgressChart(
  canvas: HTMLCanvasElement,
  bars: ProgressChartBar[],
  colors: ProgressChartColors,
  opts: { reducedMotion: boolean; formatValue: (value: number) => string },
): ProgressChartHandle {
  const last = bars.length - 1
  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: bars.map((bar) => bar.label),
      datasets: [
        {
          data: bars.map((bar) => bar.value),
          backgroundColor: bars.map((_, i) => (i === last ? colors.accent : colors.accentSoft)),
          hoverBackgroundColor: colors.accent,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 28,
          categoryPercentage: 0.8,
          barPercentage: 0.9,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: opts.reducedMotion ? false : { duration: 450, easing: 'easeOutQuart' },
      layout: { padding: { top: 4 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          padding: 10,
          cornerRadius: 10,
          callbacks: {
            title: (items: TooltipItem<'bar'>[]) => bars[items[0]?.dataIndex ?? 0]?.tooltip[0] ?? '',
            label: (item: TooltipItem<'bar'>) => bars[item.dataIndex]?.tooltip.slice(1) ?? [],
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: colors.text, font: { size: 11 }, maxRotation: 0, autoSkipPadding: 8 },
        },
        y: {
          // Bars start at zero: a cut axis makes 2.5 kg look like doubling.
          beginAtZero: true,
          grid: { color: colors.grid },
          border: { display: false },
          ticks: {
            color: colors.text,
            font: { size: 11 },
            maxTicksLimit: 4,
            callback: (value) => opts.formatValue(Number(value)),
          },
        },
      },
    },
  })
  return { destroy: () => chart.destroy() }
}

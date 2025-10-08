let chartModulePromise;

function ensureChart() {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (!chartModulePromise) {
    chartModulePromise = import('https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js').then((module) => {
      const Chart = module.Chart || module.default;
      window.Chart = Chart;
      return Chart;
    });
  }
  return chartModulePromise;
}

export function renderSparkline(canvas, data, color = 'rgba(96, 165, 250, 0.6)') {
  if (!canvas) return;
  ensureChart().then((Chart) => {
    if (!Chart) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    if (canvas.__chartInstance) {
      canvas.__chartInstance.data.datasets[0].data = data;
      canvas.__chartInstance.update();
      return;
    }
    canvas.__chartInstance = new Chart(context, {
      type: 'line',
      data: {
        labels: data.map((_, index) => index + 1),
        datasets: [
          {
            data,
            borderColor: color,
            backgroundColor: color.replace('0.6', '0.18'),
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    });
  });
}

export function lazySparkline(canvas, data, color) {
  if (!canvas) return;
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          renderSparkline(canvas, data, color);
          observer.disconnect();
        }
      });
    }, { threshold: 0.2 });
    observer.observe(canvas);
  } else {
    renderSparkline(canvas, data, color);
  }
}

var chartInstance = null;

export function initChart(canvas, historico) {
    if (chartInstance) {
        chartInstance.destroy();
    }

    var ctx = canvas.getContext('2d');
    var labels = historico.map(function (h) { return h.label; });
    var data = historico.map(function (h) { return h.nivel; });

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nivel (m)',
                data: data,
                borderColor: '#3b82f6',
                backgroundColor: function (context) {
                    var g = context.chart.ctx.createLinearGradient(0, 0, 0, 220);
                    g.addColorStop(0, 'rgba(59,130,246,0.35)');
                    g.addColorStop(1, 'rgba(59,130,246,0.0)');
                    return g;
                },
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#0f172a',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.9)',
                    titleFont: { family: 'Outfit', size: 12 },
                    bodyFont: { family: 'JetBrains Mono', size: 12 },
                    padding: 10,
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(51,65,85,0.3)' },
                    ticks: { color: '#7c8db5', font: { family: 'JetBrains Mono', size: 11 } }
                },
                x: {
                    grid: { color: 'rgba(51,65,85,0.15)' },
                    ticks: { color: '#7c8db5', font: { family: 'Outfit', size: 10 } }
                }
            }
        }
    });
}

export function updateChartData(historico) {
    if (!chartInstance) return;

    var labels = historico.map(function (h) { return h.label; });
    var data = historico.map(function (h) { return h.nivel; });

    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = data;
    chartInstance.update();
}

export function destroyChart() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}
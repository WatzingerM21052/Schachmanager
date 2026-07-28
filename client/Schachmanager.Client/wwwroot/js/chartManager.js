// Ported from SchuelerligaManager's inline index.html script. Small bar-chart helper used
// by the Auswertung/standings page to show age-class and club distributions.
window.chartManager = {
    instances: {},
    renderBarChart: function (canvasId, labelName, labels, data, color) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (window.chartManager.instances[canvasId]) window.chartManager.instances[canvasId].destroy();
        window.chartManager.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: { labels: labels, datasets: [{ label: labelName, data: data, backgroundColor: color || '#0d6efd', borderRadius: 4 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, grid: { color: '#f0f0f0' } }, x: { grid: { display: false } } }
            }
        });
    },
    // Generic entry point for pages that need chart types/options beyond renderBarChart
    // (e.g. Statistics.razor's doughnut age chart) - takes a full Chart.js config object.
    setupChart: function (canvasId, config) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (window.chartManager.instances[canvasId]) window.chartManager.instances[canvasId].destroy();
        window.chartManager.instances[canvasId] = new Chart(ctx, config);
    }
};

window.setupChart = window.chartManager.setupChart;

window.downloadFile = function (fileName, content) {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = "data:text/csv;charset=utf-8,%EF%BB%BF" + encodeURIComponent(content);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.downloadBinaryFile = function (fileName, base64String) {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = "data:application/octet-stream;base64," + base64String;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

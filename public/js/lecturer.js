// Chart instances
let histogramChart = null;
let timeSeriesChart = null;

// Mean descriptions based on value
function getMeanDescription(mean) {
    if (mean === 0) return 'Waiting for students...';
    if (mean < 2) return 'Students are struggling! Consider slowing down.';
    if (mean < 3) return 'Some students need more explanation.';
    if (mean < 4) return 'Most students are following along.';
    if (mean < 4.5) return 'Class is comfortable with the pace.';
    return 'Students want you to speed up!';
}

// Update the stats display
function updateStats(stats) {
    const meanEl = document.getElementById('mean-value');
    const countEl = document.getElementById('student-count');
    const descEl = document.getElementById('mean-description');

    // Update mean
    if (stats.count === 0) {
        meanEl.textContent = '--';
    } else {
        meanEl.textContent = stats.mean.toFixed(1);
    }

    // Update count
    countEl.textContent = stats.count;

    // Update description
    descEl.textContent = getMeanDescription(stats.mean);

    // Update histogram
    updateHistogram(stats.histogram);

    // Update time-series chart
    updateTimeSeries(stats.timeHistory || []);

    // Update questions panel
    updateQuestions(stats.questions || []);
}

// Format timestamp for display
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Update the questions panel
function updateQuestions(questions) {
    const listEl = document.getElementById('questions-list');
    const countEl = document.getElementById('questions-count');
    const emptyEl = document.getElementById('questions-empty');

    // Update count badge
    countEl.textContent = questions.length;

    // Show/hide empty state
    if (questions.length === 0) {
        emptyEl.style.display = 'block';
        // Remove all question cards
        listEl.querySelectorAll('.question-card').forEach(card => card.remove());
        return;
    }

    emptyEl.style.display = 'none';

    // Create question cards HTML
    const questionsHtml = questions.map(q => `
        <div class="question-card" data-id="${q.id}">
            <div class="question-content">
                <div class="question-text">${escapeHtml(q.text)}</div>
                <div class="question-time">${formatTime(q.timestamp)}</div>
            </div>
            <button class="question-dismiss" onclick="dismissQuestion(${q.id})" title="Dismiss question">✕</button>
        </div>
    `).join('');

    // Update only if content changed
    const currentCards = listEl.querySelectorAll('.question-card');
    const currentIds = Array.from(currentCards).map(c => c.dataset.id).join(',');
    const newIds = questions.map(q => q.id).join(',');

    if (currentIds !== newIds) {
        // Keep empty element, replace cards
        listEl.innerHTML = `<div class="questions-empty" id="questions-empty" style="display: none;">
            No questions yet. Students can submit anonymous questions.
        </div>` + questionsHtml;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Dismiss a question
async function dismissQuestion(id) {
    try {
        await fetch(`/api/question/${id}/dismiss`, { method: 'POST' });
    } catch (error) {
        console.error('Error dismissing question:', error);
    }
}

// Initialize or update the histogram chart
function updateHistogram(histogram) {
    const ctx = document.getElementById('histogram').getContext('2d');

    const data = [
        histogram[1] || 0,
        histogram[2] || 0,
        histogram[3] || 0,
        histogram[4] || 0,
        histogram[5] || 0
    ];

    const colors = [
        'rgba(239, 68, 68, 0.8)',   // Red
        'rgba(249, 115, 22, 0.8)',  // Orange
        'rgba(234, 179, 8, 0.8)',   // Yellow
        'rgba(34, 197, 94, 0.8)',   // Green
        'rgba(59, 130, 246, 0.8)'   // Blue
    ];

    const borderColors = [
        'rgb(239, 68, 68)',
        'rgb(249, 115, 22)',
        'rgb(234, 179, 8)',
        'rgb(34, 197, 94)',
        'rgb(59, 130, 246)'
    ];

    if (histogramChart) {
        // Update existing chart
        histogramChart.data.datasets[0].data = data;
        histogramChart.update('none');
    } else {
        // Create new chart
        histogramChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['1', '2', '3', '4', '5'],
                datasets: [{
                    label: 'Students',
                    data: data,
                    backgroundColor: colors,
                    borderColor: borderColors,
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 14 },
                        bodyFont: { size: 13 },
                        callbacks: {
                            title: function (context) {
                                const labels = [
                                    'Completely Lost',
                                    'Struggling',
                                    'Following Along',
                                    'Comfortable',
                                    'Speed Up!'
                                ];
                                return labels[context[0].dataIndex];
                            },
                            label: function (context) {
                                const count = context.raw;
                                return count === 1 ? '1 student' : `${count} students`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            color: 'rgba(255, 255, 255, 0.6)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.6)',
                            font: { size: 14, weight: 'bold' }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
}

// Initialize or update the time-series chart
function updateTimeSeries(history) {
    const ctx = document.getElementById('time-series').getContext('2d');

    // Convert to {x: timestamp, y: mean} format for time scale
    const data = history.map(point => ({
        x: new Date(point.timestamp),
        y: point.mean
    }));

    if (timeSeriesChart) {
        // Update existing chart
        timeSeriesChart.data.datasets[0].data = data;
        timeSeriesChart.update('none');
    } else {
        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

        // Create new chart
        timeSeriesChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Average Understanding',
                    data: data,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: 'rgb(59, 130, 246)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 14 },
                        bodyFont: { size: 13 },
                        callbacks: {
                            title: function (context) {
                                const date = new Date(context[0].parsed.x);
                                return date.toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                });
                            },
                            label: function (context) {
                                return `Average: ${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        min: 1,
                        max: 5,
                        ticks: {
                            stepSize: 1,
                            color: 'rgba(255, 255, 255, 0.6)',
                            callback: function (value) {
                                const labels = ['', 'Lost', 'Struggling', 'Following', 'Comfortable', 'Speed Up'];
                                return labels[value] || value;
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        type: 'time',
                        time: {
                            unit: 'second',
                            displayFormats: {
                                second: 'HH:mm:ss'
                            }
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.6)',
                            maxRotation: 45,
                            minRotation: 45,
                            maxTicksLimit: 10
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    }
                },
                animation: {
                    duration: 300
                }
            }
        });
    }
}

// Reset all responses
async function resetResponses() {
    if (!confirm('Are you sure you want to reset all student responses?')) {
        return;
    }

    try {
        await fetch('/api/reset', { method: 'POST' });
    } catch (error) {
        console.error('Error resetting:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Connect to Socket.IO
    const socket = io();

    // Add connection status indicator
    const statusDiv = document.createElement('div');
    statusDiv.className = 'connection-status';
    statusDiv.innerHTML = '<span class="status-dot"></span><span class="status-text">Connecting...</span>';
    document.body.appendChild(statusDiv);

    socket.on('connect', () => {
        statusDiv.className = 'connection-status connected';
        statusDiv.querySelector('.status-text').textContent = 'Live';
    });

    socket.on('disconnect', () => {
        statusDiv.className = 'connection-status disconnected';
        statusDiv.querySelector('.status-text').textContent = 'Disconnected';
    });

    // Listen for stats updates
    socket.on('stats-update', (stats) => {
        updateStats(stats);
    });

    // Reset button
    document.getElementById('reset-btn').addEventListener('click', resetResponses);

    // Initial fetch
    fetch('/api/stats')
        .then(res => res.json())
        .then(stats => updateStats(stats))
        .catch(err => console.error('Error fetching initial stats:', err));
});

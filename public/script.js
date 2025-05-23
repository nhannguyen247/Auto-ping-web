const targetInput = document.getElementById('targetInput');
const intervalInput = document.getElementById('intervalInput');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const resultsDiv = document.getElementById('results');

let pingIntervalId = null;

async function performPing() {
    const target = targetInput.value.trim();
    if (!target) {
        appendResult('Error: Please enter a target.', 'failed');
        return;
    }

    try {
        appendResult(`Pinging ${target}...`, 'info');
        // Gọi API backend bằng đường dẫn tương đối, vì frontend và backend
        // sẽ được phục vụ từ cùng một dịch vụ Render.
        const response = await fetch('/api/ping', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ target: target }),
        });

        const data = await response.json();

        if (data.success === false) {
            appendResult(`[${data.timestamp}] ${data.target}: ${data.message || 'Ping failed.'}`, 'failed');
        } else {
            const statusClass = data.status === 'success' ? 'status-success' : 'status-failed';
            appendResult(`[${data.timestamp}] ${data.target} - Status: <span class="${statusClass}">${data.status.toUpperCase()}</span> - Latency: ${data.latency}`, statusClass);
            if (data.output) {
                appendResult(`Full Output:\n${data.output}\n---`, 'output');
            }
        }

    } catch (error) {
        console.error('Error during ping:', error);
        appendResult(`[${new Date().toLocaleString()}] Error: Could not reach server or unknown error: ${error.message}`, 'failed');
    } finally {
        resultsDiv.scrollTop = resultsDiv.scrollHeight;
    }
}

function startPing() {
    const interval = parseInt(intervalInput.value) * 1000;
    const target = targetInput.value.trim();

    if (!target) {
        alert('Please enter a target (IP or Domain).');
        return;
    }
    if (isNaN(interval) || interval < 1000) {
        alert('Please enter a valid interval (at least 1 second).');
        return;
    }

    stopPing(); // Clear any existing interval

    performPing(); // Run immediately on start
    pingIntervalId = setInterval(performPing, interval);

    startButton.disabled = true;
    stopButton.disabled = false;
    targetInput.disabled = true;
    intervalInput.disabled = true;
    resultsDiv.innerHTML = '';
    appendResult(`Starting auto ping for ${target} every ${interval / 1000} seconds...`, 'info');
}

function stopPing() {
    if (pingIntervalId) {
        clearInterval(pingIntervalId);
        pingIntervalId = null;
        appendResult(`Auto ping stopped.`, 'info');
    }
    startButton.disabled = false;
    stopButton.disabled = true;
    targetInput.disabled = false;
    intervalInput.disabled = false;
}

function appendResult(message, type = '') {
    const p = document.createElement('p');
    p.classList.add('result-item');
    if (type) {
        p.classList.add(type);
    }
    p.innerHTML = message;
    resultsDiv.appendChild(p);
}

startButton.addEventListener('click', startPing);
stopButton.addEventListener('click', stopPing);

stopButton.disabled = true;

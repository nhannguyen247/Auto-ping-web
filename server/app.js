const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const path = require('path');

const app = express();
// Render sẽ cung cấp biến môi trường PORT. Nếu không có, dùng 3000 (cho local dev)
const PORT = process.env.PORT || 3000;

// Cấu hình CORS. Trong môi trường production, bạn nên chỉ định rõ origin cụ thể
// Ví dụ: app.use(cors({ origin: 'https://your-render-app-url.onrender.com' }));
app.use(cors());

app.use(express.json());

// Phục vụ các file tĩnh từ thư mục 'public'.
// __dirname là thư mục hiện tại (server/), nên cần '..' để về thư mục gốc của dự án.
app.use(express.static(path.join(__dirname, '../public')));

// API endpoint để thực hiện ping
app.post('/api/ping', (req, res) => {
    const { target } = req.body;

    // --- RẤT QUAN TRỌNG: Validation đầu vào để ngăn chặn Command Injection ---
    // Chỉ chấp nhận các ký tự chữ cái, số, dấu chấm, dấu gạch ngang (cho domain/IP)
    // Đây là biện pháp cơ bản, không nên coi là hoàn hảo cho các hệ thống quan trọng.
    if (!target || !/^[a-zA-Z0-9.-]+$/.test(target)) {
        return res.status(400).json({ success: false, message: 'Invalid target specified.' });
    }

    // Chọn lệnh ping phù hợp với hệ điều hành
    // -c 4 : Gửi 4 gói tin (Linux/macOS)
    // -n 4 : Gửi 4 gói tin (Windows)
    // Render chạy trên Linux, nên lệnh 'ping -c 4' là phù hợp.
    const pingCommand = `ping -c 4 ${target}`;

    exec(pingCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error for ${target}: ${error.message}`);
            let errorMessage = `Ping failed for ${target}.`;
            if (stderr) errorMessage += ` Stderr: ${stderr.trim()}`;
            if (error.message.includes('unknown host')) {
                errorMessage = `Unknown host: ${target}`;
            } else if (error.message.includes('Destination Host Unreachable')) {
                errorMessage = `Destination Host Unreachable: ${target}`;
            }
            return res.json({ success: false, message: errorMessage, details: error.message });
        }

        const result = {
            target: target,
            timestamp: new Date().toLocaleString(),
            output: stdout.trim(),
            status: 'success',
            latency: 'N/A'
        };

        const match = stdout.match(/time=(\d+(\.\d+)?)\s*ms|Avg = (\d+ms)/i);
        if (match) {
            if (match[1]) {
                result.latency = `${parseFloat(match[1])}ms`;
            } else if (match[3]) {
                result.latency = match[3];
            }
        } else {
            if (stdout.includes('100% packet loss')) {
                result.status = 'failed';
                result.message = '100% packet loss.';
            } else if (stdout.includes('Request timed out') || stdout.includes('timed out')) {
                result.status = 'failed';
                result.message = 'Request timed out.';
            }
        }
        
        res.json(result);
    });
});

// Lắng nghe cổng
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Access the application via its public URL.`);
});

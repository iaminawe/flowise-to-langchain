const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs').promises;
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Port configuration
const PORT = process.env.PORT || 3001;

// Handle preflight requests
app.options('*', cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Flow conversion endpoint
app.post('/api/convert', async (req, res) => {
  try {
    const { flow, settings } = req.body;
    
    // Save flow to temporary file
    const tempFlowPath = path.join(__dirname, 'temp', `flow-${Date.now()}.json`);
    await fs.mkdir(path.dirname(tempFlowPath), { recursive: true });
    await fs.writeFile(tempFlowPath, JSON.stringify(flow, null, 2));
    
    // Prepare conversion command
    const outputLang = settings?.outputLanguage || 'python';
    const cliPath = path.join(__dirname, '../../index.js');
    const outputPath = path.join(__dirname, 'temp', `output-${Date.now()}`);
    
    const command = `node ${cliPath} --input ${tempFlowPath} --output ${outputPath} --format ${outputLang}`;
    
    // Execute conversion
    exec(command, async (error, stdout, stderr) => {
      // Clean up temp file
      await fs.unlink(tempFlowPath).catch(() => {});
      
      if (error) {
        console.error('Conversion error:', error);
        return res.status(500).json({
          success: false,
          error: stderr || error.message,
        });
      }
      
      try {
        // Read converted files
        const files = await fs.readdir(outputPath);
        const result = {
          success: true,
          files: {},
          logs: stdout,
        };
        
        for (const file of files) {
          const content = await fs.readFile(path.join(outputPath, file), 'utf-8');
          result.files[file] = content;
        }
        
        // Clean up output directory
        await fs.rm(outputPath, { recursive: true, force: true }).catch(() => {});
        
        res.json(result);
      } catch (readError) {
        console.error('Error reading output:', readError);
        res.status(500).json({
          success: false,
          error: 'Failed to read conversion output',
        });
      }
    });
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Test endpoint
app.post('/api/test', async (req, res) => {
  try {
    const { code, testCases, language } = req.body;
    
    // For now, return mock results
    const results = testCases.map((testCase, index) => ({
      id: `test-${Date.now()}-${index}`,
      name: testCase.name,
      status: Math.random() > 0.3 ? 'passed' : 'failed',
      duration: Math.floor(Math.random() * 1000) + 100,
      timestamp: new Date().toISOString(),
      output: {
        actual: 'Test output',
        expected: testCase.expectedOutput,
      },
    }));
    
    res.json({
      success: true,
      results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed').length,
      },
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// WebSocket handling for real-time updates
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('WebSocket message:', data);
      
      // Echo back for now
      ws.send(JSON.stringify({
        type: 'ack',
        originalMessage: data,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
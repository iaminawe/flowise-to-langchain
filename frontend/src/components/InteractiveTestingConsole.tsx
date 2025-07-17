import React, { useState } from 'react';
import { FlowiseFlow, ConversionResult } from '../types';

interface InteractiveTestingConsoleProps {
  flow: FlowiseFlow;
  conversionResult: ConversionResult;
  testConfiguration: any;
}

export const InteractiveTestingConsole: React.FC<InteractiveTestingConsoleProps> = ({
  flow,
  conversionResult,
  testConfiguration,
}) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const handleRunCode = async () => {
    if (!input.trim()) return;

    setIsRunning(true);
    setHistory(prev => [...prev, `> ${input}`]);

    // Simulate code execution
    setTimeout(() => {
      const mockOutput = `Executing: ${input}\nResult: Success\nOutput: Mock response for testing`;
      setOutput(mockOutput);
      setHistory(prev => [...prev, mockOutput]);
      setIsRunning(false);
    }, 1000);
  };

  return (
    <div className="interactive-testing-console">
      <h3>Interactive Testing Console</h3>
      
      <div className="console-info">
        <p>Test your converted {flow.name} interactively</p>
        <p>Format: {conversionResult.metadata.format}</p>
      </div>
      
      <div className="console-history">
        {history.map((line, index) => (
          <div key={index} className={`console-line ${line.startsWith('>') ? 'input' : 'output'}`}>
            {line}
          </div>
        ))}
        {isRunning && (
          <div className="console-line running">
            <div className="spinner"></div>
            Running...
          </div>
        )}
      </div>
      
      <div className="console-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter test code here..."
          rows={4}
        />
        <button 
          onClick={handleRunCode}
          disabled={isRunning || !input.trim()}
          type="button"
        >
          {isRunning ? 'Running...' : 'Run Code'}
        </button>
      </div>
      
      <div className="console-examples">
        <h4>Example Commands</h4>
        <button 
          onClick={() => setInput('await chain.invoke("Hello, world!")')}
          type="button"
        >
          Test Chain Invoke
        </button>
        <button 
          onClick={() => setInput('console.log(chain.getConfiguration())')}
          type="button"
        >
          Get Configuration
        </button>
      </div>
    </div>
  );
};
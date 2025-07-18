#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Run the converter using the flowise-to-langchain CLI
const converterPath = path.join(__dirname, 'flowise-to-langchain', 'bin', 'flowise-to-lc.js');
const inputFile = path.join(__dirname, 'TenFourOptics Chatflow.json');
const outputFile = path.join(__dirname, 'tenfouroptics-converted.ts');

console.log('Running flowise-to-langchain converter...');
console.log('Input:', inputFile);
console.log('Output:', outputFile);

const converter = spawn('node', [
  converterPath,
  'convert',
  inputFile,
  '-o',
  outputFile
], {
  stdio: 'inherit'
});

converter.on('error', (error) => {
  console.error('Failed to start converter:', error);
});

converter.on('close', (code) => {
  if (code === 0) {
    console.log('Conversion completed successfully!');
  } else {
    console.error(`Converter exited with code ${code}`);
  }
});
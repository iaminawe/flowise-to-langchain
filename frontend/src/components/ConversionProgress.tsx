import React from 'react';
import { FlowiseFlow, ConversionOptions } from '../types';

interface ConversionProgressProps {
  flow: FlowiseFlow;
  options: ConversionOptions;
}

export const ConversionProgress: React.FC<ConversionProgressProps> = ({
  flow,
  options,
}) => {
  return (
    <div className="conversion-progress-overlay">
      <div className="conversion-progress">
        <div className="progress-header">
          <h3>Converting Flow</h3>
          <div className="spinner"></div>
        </div>
        
        <div className="progress-details">
          <p>Converting {flow.name} to {options.format}...</p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '60%' }}></div>
          </div>
          <p className="progress-text">Processing nodes...</p>
        </div>
      </div>
    </div>
  );
};
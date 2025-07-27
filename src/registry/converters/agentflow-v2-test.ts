/**
 * Test file demonstrating AgentFlow V2 reference resolution
 */

import { 
  AgentNodeConverter, 
  ToolNodeConverter, 
  CustomFunctionNodeConverter,
  SubflowNodeConverter
} from './agentflow-v2.js';
import { IRNode, GenerationContext } from '../../ir/types.js';

// Example of how the reference resolution works
function demonstrateReferenceResolution() {
  // Reset the reference resolver for a clean state
  AgentNodeConverter.resetReferenceResolver();
  
  // Create sample nodes
  const llmNode: IRNode = {
    id: 'llm_1',
    type: 'chatModel',
    flowiseType: 'chatOpenAI',
    parameters: [
      { name: 'temperature', value: 0.7 },
      { name: 'modelName', value: 'gpt-4' }
    ]
  };
  
  const toolNode: IRNode = {
    id: 'tool_1',
    type: 'tool',
    flowiseType: 'toolNode',
    parameters: [
      { name: 'name', value: 'calculator' },
      { name: 'description', value: 'A calculator tool' },
      { name: 'func', value: '(input) => eval(input)' }
    ]
  };
  
  const memoryNode: IRNode = {
    id: 'memory_1',
    type: 'memory',
    flowiseType: 'bufferMemory',
    parameters: [
      { name: 'memoryKey', value: 'chat_history' }
    ]
  };
  
  const agentNode: IRNode = {
    id: 'agent_1',
    type: 'agent',
    flowiseType: 'agentNode',
    parameters: [
      { name: 'agentType', value: 'openai-functions' },
      { name: 'llm', value: 'llm_1' }, // Reference to LLM node
      { name: 'tools', value: ['tool_1'] }, // Reference to tool node
      { name: 'memory', value: 'memory_1' }, // Reference to memory node
      { name: 'maxIterations', value: 10 }
    ]
  };
  
  const context: GenerationContext = {
    graph: {
      nodes: [llmNode, toolNode, memoryNode, agentNode],
      edges: [
        { id: 'edge_1', source: 'llm_1', target: 'agent_1', sourceHandle: 'output', targetHandle: 'llm' },
        { id: 'edge_2', source: 'tool_1', target: 'agent_1', sourceHandle: 'output', targetHandle: 'tools' },
        { id: 'edge_3', source: 'memory_1', target: 'agent_1', sourceHandle: 'output', targetHandle: 'memory' }
      ]
    },
    imports: new Map(),
    variables: new Map(),
    mainChain: null
  };
  
  // Register nodes (this would normally happen during conversion)
  const resolver = AgentNodeConverter.getReferenceResolver();
  resolver.registerNode('llm_1', 'chatOpenAI_llm_1', 'llm');
  resolver.registerNode('tool_1', 'calculator_tool_1', 'tool');
  resolver.registerNode('memory_1', 'bufferMemory_memory_1', 'memory');
  resolver.registerNode('agent_1', 'agent_node_agent_1', 'agent');
  
  // Track dependencies
  resolver.addDependency('agent_1', 'llm_1');
  resolver.addDependency('agent_1', 'tool_1');
  resolver.addDependency('agent_1', 'memory_1');
  
  // Convert the agent node
  const converter = new AgentNodeConverter();
  const fragments = converter.convert(agentNode, context);
  
  // The generated code will have resolved references:
  // - LLM_REFERENCE_PLACEHOLDER → chatOpenAI_llm_1
  // - TOOLS_REFERENCE_PLACEHOLDER → [calculator_tool_1]
  // - MEMORY_REFERENCE_PLACEHOLDER → bufferMemory_memory_1
  
  console.log('Generated fragments:', fragments);
  
  // Get initialization order
  const initOrder = resolver.getInitializationOrder();
  console.log('Initialization order:', initOrder.map(n => n.variableName));
  // Output: ['chatOpenAI_llm_1', 'calculator_tool_1', 'bufferMemory_memory_1', 'agent_node_agent_1']
}

// Example of subflow reference resolution
function demonstrateSubflowResolution() {
  const subflowNode: IRNode = {
    id: 'subflow_1',
    type: 'subflow',
    flowiseType: 'subflowNode',
    parameters: [
      { name: 'subflowId', value: 'workflow_123' },
      { name: 'parallel', value: true },
      { name: 'inputMapping', value: { input: 'query' } },
      { name: 'outputMapping', value: { result: 'output' } }
    ]
  };
  
  const context: GenerationContext = {
    graph: {
      nodes: [subflowNode],
      edges: []
    },
    imports: new Map(),
    variables: new Map(),
    mainChain: null
  };
  
  const converter = new SubflowNodeConverter();
  const fragments = converter.convert(subflowNode, context);
  
  // SUBFLOW_STEPS_PLACEHOLDER will be resolved to actual runnable references
  console.log('Subflow fragments:', fragments);
}

// Example of custom function with references
function demonstrateCustomFunctionResolution() {
  const functionNode: IRNode = {
    id: 'function_1',
    type: 'customFunction',
    flowiseType: 'customFunctionNode',
    parameters: [
      { name: 'name', value: 'dataProcessor' },
      { name: 'code', value: 'return processData(input);' },
      { name: 'enableState', value: true },
      { name: 'stateVariables', value: { count: 0, results: [] } }
    ]
  };
  
  const context: GenerationContext = {
    graph: {
      nodes: [functionNode],
      edges: []
    },
    imports: new Map(),
    variables: new Map(),
    mainChain: null
  };
  
  const converter = new CustomFunctionNodeConverter();
  const fragments = converter.convert(functionNode, context);
  
  console.log('Function fragments:', fragments);
}

// Export for testing
export {
  demonstrateReferenceResolution,
  demonstrateSubflowResolution,
  demonstrateCustomFunctionResolution
};
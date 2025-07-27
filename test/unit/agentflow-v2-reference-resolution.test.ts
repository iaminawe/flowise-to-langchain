import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AgentFlowV2Converter } from '../../src/registry/converters/agentflow-v2.js';
import type { IRNode, GenerationContext } from '../../src/ir/types.js';

describe('AgentFlow V2 Reference Resolution', () => {
  let converter: AgentFlowV2Converter;
  let mockContext: GenerationContext;

  beforeEach(() => {
    converter = new AgentFlowV2Converter();
    mockContext = {
      targetLanguage: 'typescript',
      includeLangfuse: false,
      includeComments: true,
      outputFormat: 'esm',
    };
  });

  describe('ReferenceResolver', () => {
    it('should register nodes and track dependencies', () => {
      const llmNode: IRNode = {
        id: 'llm-1',
        type: 'ChatOpenAI',
        label: 'OpenAI LLM',
        data: {},
        inputs: {},
        outputs: {},
      };

      const toolNode: IRNode = {
        id: 'tool-1',
        type: 'Calculator',
        label: 'Calculator Tool',
        data: {},
        inputs: {},
        outputs: {},
      };

      const agentNode: IRNode = {
        id: 'agent-1',
        type: 'AgentExecutor',
        label: 'Main Agent',
        data: {
          llm: 'llm-1',
          tools: ['tool-1'],
        },
        inputs: {
          llm: [{ source: 'llm-1', sourceHandle: 'output', target: 'agent-1', targetHandle: 'llm' }],
          tools: [{ source: 'tool-1', sourceHandle: 'output', target: 'agent-1', targetHandle: 'tools' }],
        },
        outputs: {},
      };

      // Test node registration
      const resolver = (converter as any).createReferenceResolver();
      resolver.registerNode(llmNode);
      resolver.registerNode(toolNode);
      resolver.registerNode(agentNode);

      // Test dependency tracking
      expect(resolver.getDependencies('agent-1')).toContain('llm-1');
      expect(resolver.getDependencies('agent-1')).toContain('tool-1');
    });

    it('should resolve LLM references correctly', () => {
      const resolver = (converter as any).createReferenceResolver();
      
      const llmNode: IRNode = {
        id: 'llm-1',
        type: 'ChatOpenAI',
        label: 'OpenAI LLM',
        data: {},
        inputs: {},
        outputs: {},
      };
      resolver.registerNode(llmNode);

      // Test string reference
      const llmRef = resolver.resolveLLMReference('llm-1');
      expect(llmRef).toBe('chatOpenAI_llm_1');

      // Test object reference
      const llmObjRef = resolver.resolveLLMReference({ nodeId: 'llm-1' });
      expect(llmObjRef).toBe('chatOpenAI_llm_1');

      // Test non-existent reference
      const nullRef = resolver.resolveLLMReference('non-existent');
      expect(nullRef).toBeNull();
    });

    it('should resolve tools references correctly', () => {
      const resolver = (converter as any).createReferenceResolver();
      
      const tool1: IRNode = {
        id: 'tool-1',
        type: 'Calculator',
        label: 'Calculator',
        data: {},
        inputs: {},
        outputs: {},
      };
      
      const tool2: IRNode = {
        id: 'tool-2',
        type: 'WebBrowser',
        label: 'Browser',
        data: {},
        inputs: {},
        outputs: {},
      };
      
      resolver.registerNode(tool1);
      resolver.registerNode(tool2);

      // Test array of references
      const toolsRef = resolver.resolveToolsReference(['tool-1', 'tool-2']);
      expect(toolsRef).toEqual(['calculator_tool_1', 'webBrowser_tool_2']);

      // Test with connected tools
      const agentNode: IRNode = {
        id: 'agent-1',
        type: 'AgentExecutor',
        label: 'Agent',
        data: {},
        inputs: {
          tools: [
            { source: 'tool-1', sourceHandle: 'output', target: 'agent-1', targetHandle: 'tools' },
          ],
        },
        outputs: {},
      };
      resolver.registerNode(agentNode);

      const connectedTools = resolver.resolveToolsReference([], 'agent-1');
      expect(connectedTools).toContain('calculator_tool_1');
    });

    it('should resolve memory references correctly', () => {
      const resolver = (converter as any).createReferenceResolver();
      
      const memoryNode: IRNode = {
        id: 'memory-1',
        type: 'BufferMemory',
        label: 'Chat Memory',
        data: {},
        inputs: {},
        outputs: {},
      };
      resolver.registerNode(memoryNode);

      const memoryRef = resolver.resolveMemoryReference('memory-1');
      expect(memoryRef).toBe('bufferMemory_memory_1');
    });

    it('should resolve subflow references correctly', () => {
      const resolver = (converter as any).createReferenceResolver();
      
      const subflowNode: IRNode = {
        id: 'subflow-1',
        type: 'AgentExecutor',
        label: 'Subflow Agent',
        data: {},
        inputs: {},
        outputs: {},
      };
      resolver.registerNode(subflowNode);

      const subflowRef = resolver.resolveSubflowReference('subflow-1');
      expect(subflowRef).toBe('agentExecutor_subflow_1');
    });

    it('should detect circular dependencies', () => {
      const resolver = (converter as any).createReferenceResolver();
      
      // Create circular dependency: A -> B -> C -> A
      resolver.addDependency('A', 'B');
      resolver.addDependency('B', 'C');
      resolver.addDependency('C', 'A');

      expect(() => resolver.getInitializationOrder()).toThrow('Circular dependency detected');
    });

    it('should provide correct initialization order', () => {
      const resolver = (converter as any).createReferenceResolver();
      
      // Create dependency chain: D -> C -> B -> A
      resolver.addDependency('D', 'C');
      resolver.addDependency('C', 'B');
      resolver.addDependency('B', 'A');
      
      // Register nodes
      ['A', 'B', 'C', 'D'].forEach(id => {
        resolver.registerNode({
          id,
          type: 'TestNode',
          label: `Node ${id}`,
          data: {},
          inputs: {},
          outputs: {},
        });
      });

      const order = resolver.getInitializationOrder();
      expect(order).toEqual(['A', 'B', 'C', 'D']);
    });
  });

  describe('Placeholder Resolution', () => {
    it('should replace LLM_REFERENCE_PLACEHOLDER', () => {
      const agentNode: IRNode = {
        id: 'agent-1',
        type: 'AgentExecutor',
        label: 'Agent',
        data: {
          llm: 'llm-1',
        },
        inputs: {},
        outputs: {},
      };

      const fragments = converter.convert(agentNode, mockContext);
      const code = fragments.map(f => f.content).join('\n');

      expect(code).not.toContain('/* LLM_REFERENCE_PLACEHOLDER */');
      expect(code).toContain('llm:');
    });

    it('should replace TOOLS_REFERENCE_PLACEHOLDER', () => {
      const agentNode: IRNode = {
        id: 'agent-1',
        type: 'AgentExecutor',
        label: 'Agent',
        data: {
          tools: ['tool-1', 'tool-2'],
        },
        inputs: {},
        outputs: {},
      };

      const fragments = converter.convert(agentNode, mockContext);
      const code = fragments.map(f => f.content).join('\n');

      expect(code).not.toContain('/* TOOLS_REFERENCE_PLACEHOLDER */');
      expect(code).toContain('tools:');
    });

    it('should replace MEMORY_REFERENCE_PLACEHOLDER', () => {
      const agentNode: IRNode = {
        id: 'agent-1',
        type: 'AgentExecutor',
        label: 'Agent',
        data: {
          memory: 'memory-1',
        },
        inputs: {},
        outputs: {},
      };

      const fragments = converter.convert(agentNode, mockContext);
      const code = fragments.map(f => f.content).join('\n');

      expect(code).not.toContain('/* MEMORY_REFERENCE_PLACEHOLDER */');
      expect(code).toContain('memory:');
    });

    it('should replace SUBFLOW_STEPS_PLACEHOLDER', () => {
      const sequentialNode: IRNode = {
        id: 'seq-1',
        type: 'SequentialChain',
        label: 'Sequential Flow',
        data: {
          steps: ['step-1', 'step-2'],
        },
        inputs: {},
        outputs: {},
      };

      const fragments = converter.convert(sequentialNode, mockContext);
      const code = fragments.map(f => f.content).join('\n');

      expect(code).not.toContain('/* SUBFLOW_STEPS_PLACEHOLDER */');
    });

    it('should handle custom NODE_<ID>_PLACEHOLDER pattern', () => {
      const resolver = (converter as any).createReferenceResolver();
      
      const customNode: IRNode = {
        id: 'custom-1',
        type: 'CustomNode',
        label: 'Custom',
        data: {},
        inputs: {},
        outputs: {},
      };
      resolver.registerNode(customNode);

      const resolved = resolver.resolvePlaceholder('/* NODE_custom-1_PLACEHOLDER */');
      expect(resolved).toBe('customNode_custom_1');
    });
  });

  describe('Complex Reference Scenarios', () => {
    it('should handle agent with multiple tool references', () => {
      const tools = ['calc-1', 'search-1', 'browser-1'];
      const agentNode: IRNode = {
        id: 'agent-1',
        type: 'OpenAIFunctionsAgent',
        label: 'Multi-Tool Agent',
        data: {
          tools,
          llm: 'gpt-1',
        },
        inputs: {},
        outputs: {},
      };

      const fragments = converter.convert(agentNode, mockContext);
      const code = fragments.map(f => f.content).join('\n');

      // Should handle array of tools
      expect(code).toContain('tools:');
      expect(code).not.toContain('TOOLS_REFERENCE_PLACEHOLDER');
    });

    it('should handle nested agent references', () => {
      const parentAgent: IRNode = {
        id: 'parent-agent',
        type: 'AgentExecutor',
        label: 'Parent Agent',
        data: {
          llm: 'llm-1',
          subAgents: ['child-agent-1', 'child-agent-2'],
        },
        inputs: {},
        outputs: {},
      };

      const fragments = converter.convert(parentAgent, mockContext);
      const code = fragments.map(f => f.content).join('\n');

      // Should handle nested references
      expect(code).not.toContain('PLACEHOLDER');
    });

    it('should handle conditional flow references', () => {
      const conditionalNode: IRNode = {
        id: 'conditional-1',
        type: 'ConditionalFlow',
        label: 'Conditional',
        data: {
          condition: 'condition-1',
          trueFlow: 'flow-1',
          falseFlow: 'flow-2',
        },
        inputs: {},
        outputs: {},
      };

      const fragments = converter.convert(conditionalNode, mockContext);
      const code = fragments.map(f => f.content).join('\n');

      expect(code).not.toContain('CONDITIONAL_SUBFLOW_PLACEHOLDER');
      expect(code).not.toContain('DEFAULT_SUBFLOW_PLACEHOLDER');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing node references gracefully', () => {
      const agentNode: IRNode = {
        id: 'agent-1',
        type: 'AgentExecutor',
        label: 'Agent',
        data: {
          llm: 'non-existent-llm',
          tools: ['non-existent-tool'],
        },
        inputs: {},
        outputs: {},
      };

      // Should not throw error
      expect(() => converter.convert(agentNode, mockContext)).not.toThrow();
      
      const fragments = converter.convert(agentNode, mockContext);
      const code = fragments.map(f => f.content).join('\n');
      
      // Should still generate valid code structure
      expect(code).toContain('const agentExecutor_agent_1');
    });

    it('should handle empty references', () => {
      const agentNode: IRNode = {
        id: 'agent-1',
        type: 'AgentExecutor',
        label: 'Agent',
        data: {
          llm: '',
          tools: [],
          memory: null,
        },
        inputs: {},
        outputs: {},
      };

      const fragments = converter.convert(agentNode, mockContext);
      const code = fragments.map(f => f.content).join('\n');

      // Should handle empty values without placeholders
      expect(code).not.toContain('PLACEHOLDER');
    });
  });

  describe('getDependencies', () => {
    it('should return correct dependencies for different agent types', () => {
      const openAIAgent: IRNode = {
        id: 'agent-1',
        type: 'OpenAIFunctionsAgent',
        label: 'OpenAI Agent',
        data: {},
        inputs: {},
        outputs: {},
      };

      const deps = converter.getDependencies(openAIAgent, mockContext);
      expect(deps).toContain('langchain');
      expect(deps).toContain('@langchain/core');
    });
  });
});
/**
 * Chain Converters
 * 
 * Converters for various chain types including LLMChain, ConversationChain,
 * RetrievalQAChain, and other chain types.
 */

import { IRNode, CodeFragment, GenerationContext, IRConnection } from '../../ir/types.js';
import { BaseConverter } from '../registry.js';

/**
 * Base Chain converter with common functionality
 */
abstract class BaseChainConverter extends BaseConverter {
  readonly category = 'chain';
  
  protected generateChainConfiguration(node: IRNode, context: GenerationContext): {
    imports: string[];
    packageName: string;
    className: string;
    config: Record<string, unknown>;
    inputVariables: string[];
  } {
    return {
      imports: this.getRequiredImports(),
      packageName: this.getPackageName(),
      className: this.getClassName(),
      config: this.extractChainConfig(node),
      inputVariables: this.getInputVariables(node)
    };
  }
  
  protected abstract getRequiredImports(): string[];
  protected abstract getPackageName(): string;
  protected abstract getClassName(): string;
  protected abstract extractChainConfig(node: IRNode): Record<string, unknown>;
  
  protected getInputVariables(node: IRNode): string[] {
    // Look for connected nodes to determine input variables
    const inputVariables: string[] = [];
    
    // Check for LLM input
    const llmInput = node.inputs.find(port => port.dataType === 'llm');
    if (llmInput) {
      inputVariables.push('llm');
    }
    
    // Check for prompt input
    const promptInput = node.inputs.find(port => port.dataType === 'prompt');
    if (promptInput) {
      inputVariables.push('prompt');
    }
    
    // Check for memory input
    const memoryInput = node.inputs.find(port => port.dataType === 'memory');
    if (memoryInput) {
      inputVariables.push('memory');
    }
    
    return inputVariables;
  }
  
  convert(node: IRNode, context: GenerationContext): CodeFragment[] {
    const variableName = this.generateVariableName(node, 'chain');
    const config = this.generateChainConfiguration(node, context);
    const fragments: CodeFragment[] = [];
    
    // Import fragment
    fragments.push(this.createCodeFragment(
      `${node.id}_import`,
      'import',
      this.generateImport(config.packageName, config.imports),
      [config.packageName],
      node.id,
      1
    ));
    
    // Generate the chain instantiation
    const instantiation = this.generateChainInstantiation(
      variableName,
      config.className,
      config.config,
      config.inputVariables
    );
    
    // Declaration fragment
    fragments.push(this.createCodeFragment(
      `${node.id}_declaration`,
      'declaration',
      instantiation,
      [],
      node.id,
      2,
      { 
        exports: [variableName],
        inputVariables: config.inputVariables
      }
    ));
    
    return fragments;
  }
  
  protected generateChainInstantiation(
    variableName: string,
    className: string,
    config: Record<string, unknown>,
    inputVariables: string[]
  ): string {
    const configLines: string[] = [];
    
    // Add input references (these will be populated by connection resolution)
    for (const inputVar of inputVariables) {
      configLines.push(`  ${inputVar}: ${inputVar}`);
    }
    
    // Add other configuration
    Object.entries(config)
      .filter(([_, value]) => value !== undefined)
      .forEach(([key, value]) => {
        configLines.push(`  ${key}: ${this.formatParameterValue(value)}`);
      });
    
    const configStr = configLines.join(',\n');
    
    return `const ${variableName} = new ${className}({\n${configStr}\n});`;
  }
}

/**
 * LLM Chain Converter
 */
export class LLMChainConverter extends BaseChainConverter {
  readonly flowiseType = 'llmChain';
  
  protected getRequiredImports(): string[] {
    return ['LLMChain'];
  }
  
  protected getPackageName(): string {
    return '@langchain/core/chains';
  }
  
  protected getClassName(): string {
    return 'LLMChain';
  }
  
  getDependencies(): string[] {
    return ['@langchain/core'];
  }
  
  protected extractChainConfig(node: IRNode): Record<string, unknown> {
    const outputKey = this.getParameterValue<string>(node, 'outputKey', 'text');
    const returnValues = this.getParameterValue<string[]>(node, 'returnValues');
    const verbose = this.getParameterValue<boolean>(node, 'verbose', false);
    
    return {
      outputKey,
      verbose,
      ...(returnValues && returnValues.length > 0 && { returnValues })
    };
  }
}

/**
 * Conversation Chain Converter
 */
export class ConversationChainConverter extends BaseChainConverter {
  readonly flowiseType = 'conversationChain';
  
  protected getRequiredImports(): string[] {
    return ['ConversationChain'];
  }
  
  protected getPackageName(): string {
    return '@langchain/core/chains';
  }
  
  protected getClassName(): string {
    return 'ConversationChain';
  }
  
  getDependencies(): string[] {
    return ['@langchain/core'];
  }
  
  protected extractChainConfig(node: IRNode): Record<string, unknown> {
    const outputKey = this.getParameterValue<string>(node, 'outputKey', 'response');
    const inputKey = this.getParameterValue<string>(node, 'inputKey', 'input');
    const verbose = this.getParameterValue<boolean>(node, 'verbose', false);
    
    return {
      outputKey,
      inputKey,
      verbose
    };
  }
}

/**
 * Retrieval QA Chain Converter
 */
export class RetrievalQAChainConverter extends BaseChainConverter {
  readonly flowiseType = 'retrievalQAChain';
  
  protected getRequiredImports(): string[] {
    return ['RetrievalQAChain'];
  }
  
  protected getPackageName(): string {
    return '@langchain/core/chains';
  }
  
  protected getClassName(): string {
    return 'RetrievalQAChain';
  }
  
  getDependencies(): string[] {
    return ['@langchain/core'];
  }
  
  protected extractChainConfig(node: IRNode): Record<string, unknown> {
    const chainType = this.getParameterValue<string>(node, 'chainType', 'stuff');
    const returnSourceDocuments = this.getParameterValue<boolean>(node, 'returnSourceDocuments', false);
    const verbose = this.getParameterValue<boolean>(node, 'verbose', false);
    
    return {
      chainType,
      returnSourceDocuments,
      verbose
    };
  }
  
  protected getInputVariables(node: IRNode): string[] {
    const baseVars = super.getInputVariables(node);
    
    // RetrievalQA also needs a retriever
    const retrieverInput = node.inputs.find(port => port.dataType === 'retriever');
    if (retrieverInput) {
      baseVars.push('retriever');
    }
    
    return baseVars;
  }
}

/**
 * Multi Prompt Chain Converter
 */
export class MultiPromptChainConverter extends BaseChainConverter {
  readonly flowiseType = 'multiPromptChain';
  
  protected getRequiredImports(): string[] {
    return ['MultiPromptChain'];
  }
  
  protected getPackageName(): string {
    return '@langchain/core/chains';
  }
  
  protected getClassName(): string {
    return 'MultiPromptChain';
  }
  
  getDependencies(): string[] {
    return ['@langchain/core'];
  }
  
  protected extractChainConfig(node: IRNode): Record<string, unknown> {
    const routerChain = this.getParameterValue<string>(node, 'routerChain');
    const destinationChains = this.getParameterValue<Record<string, unknown>>(node, 'destinationChains', {});
    const defaultChain = this.getParameterValue<string>(node, 'defaultChain');
    const verbose = this.getParameterValue<boolean>(node, 'verbose', false);
    
    return {
      destinationChains,
      verbose,
      ...(routerChain && { routerChain }),
      ...(defaultChain && { defaultChain })
    };
  }
}

/**
 * Sequential Chain Converter
 */
export class SequentialChainConverter extends BaseChainConverter {
  readonly flowiseType = 'sequentialChain';
  
  protected getRequiredImports(): string[] {
    return ['SequentialChain'];
  }
  
  protected getPackageName(): string {
    return '@langchain/core/chains';
  }
  
  protected getClassName(): string {
    return 'SequentialChain';
  }
  
  getDependencies(): string[] {
    return ['@langchain/core'];
  }
  
  protected extractChainConfig(node: IRNode): Record<string, unknown> {
    const chains = this.getParameterValue<unknown[]>(node, 'chains', []);
    const inputVariables = this.getParameterValue<string[]>(node, 'inputVariables', ['input']);
    const outputVariables = this.getParameterValue<string[]>(node, 'outputVariables');
    const verbose = this.getParameterValue<boolean>(node, 'verbose', false);
    
    return {
      chains,
      inputVariables,
      verbose,
      ...(outputVariables && { outputVariables })
    };
  }
}

/**
 * Transform Chain Converter
 */
export class TransformChainConverter extends BaseChainConverter {
  readonly flowiseType = 'transformChain';
  
  protected getRequiredImports(): string[] {
    return ['TransformChain'];
  }
  
  protected getPackageName(): string {
    return '@langchain/core/chains';
  }
  
  protected getClassName(): string {
    return 'TransformChain';
  }
  
  getDependencies(): string[] {
    return ['@langchain/core'];
  }
  
  protected extractChainConfig(node: IRNode): Record<string, unknown> {
    const transform = this.getParameterValue<string>(node, 'transform');
    const inputVariables = this.getParameterValue<string[]>(node, 'inputVariables', ['input']);
    const outputVariables = this.getParameterValue<string[]>(node, 'outputVariables', ['output']);
    
    return {
      inputVariables,
      outputVariables,
      ...(transform && { 
        transform: `(${transform})` // Assume transform is a function string
      })
    };
  }
  
  protected generateChainInstantiation(
    variableName: string,
    className: string,
    config: Record<string, unknown>,
    inputVariables: string[]
  ): string {
    const configLines: string[] = [];
    
    // Handle the transform function specially
    Object.entries(config)
      .filter(([_, value]) => value !== undefined)
      .forEach(([key, value]) => {
        if (key === 'transform') {
          configLines.push(`  ${key}: ${value}`); // Don't quote the function
        } else {
          configLines.push(`  ${key}: ${this.formatParameterValue(value)}`);
        }
      });
    
    const configStr = configLines.join(',\n');
    
    return `const ${variableName} = new ${className}({\n${configStr}\n});`;
  }
}

/**
 * Map Reduce Chain Converter
 */
export class MapReduceChainConverter extends BaseChainConverter {
  readonly flowiseType = 'mapReduceChain';
  
  protected getRequiredImports(): string[] {
    return ['MapReduceChain'];
  }
  
  protected getPackageName(): string {
    return '@langchain/core/chains';
  }
  
  protected getClassName(): string {
    return 'MapReduceChain';
  }
  
  getDependencies(): string[] {
    return ['@langchain/core'];
  }
  
  protected extractChainConfig(node: IRNode): Record<string, unknown> {
    const mapChain = this.getParameterValue<string>(node, 'mapChain');
    const reduceChain = this.getParameterValue<string>(node, 'reduceChain');
    const inputKey = this.getParameterValue<string>(node, 'inputKey', 'input');
    const outputKey = this.getParameterValue<string>(node, 'outputKey', 'output');
    const verbose = this.getParameterValue<boolean>(node, 'verbose', false);
    
    return {
      inputKey,
      outputKey,
      verbose,
      ...(mapChain && { mapChain }),
      ...(reduceChain && { reduceChain })
    };
  }
  
  protected getInputVariables(node: IRNode): string[] {
    const baseVars = super.getInputVariables(node);
    
    // Map-reduce chains might have specific chain inputs
    baseVars.push('mapChain', 'reduceChain');
    
    return baseVars;
  }
}
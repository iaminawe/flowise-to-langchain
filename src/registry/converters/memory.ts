/**
 * Memory Converters
 *
 * Converters for various memory types including BufferMemory, BufferWindowMemory,
 * SummaryBufferMemory, and other memory implementations.
 */

import { IRNode, CodeFragment, GenerationContext } from '../../ir/types.js';
import { BaseConverter } from '../registry.js';

/**
 * Base Memory converter with common functionality
 */
abstract class BaseMemoryConverter extends BaseConverter {
  readonly category = 'memory';

  protected generateMemoryConfiguration(
    node: IRNode,
    context: GenerationContext
  ): {
    imports: string[];
    packageName: string;
    className: string;
    config: Record<string, unknown>;
  } {
    return {
      imports: this.getRequiredImports(),
      packageName: this.getPackageName(),
      className: this.getClassName(),
      config: this.extractMemoryConfig(node),
    };
  }

  protected abstract getRequiredImports(): string[];
  protected abstract getPackageName(): string;
  protected abstract getClassName(): string;
  protected abstract extractMemoryConfig(node: IRNode): Record<string, unknown>;

  convert(node: IRNode, _context: GenerationContext): CodeFragment[] {
    const variableName = this.generateVariableName(node, 'memory');
    const config = this.generateMemoryConfiguration(node, _context);
    const fragments: CodeFragment[] = [];

    // Import fragment
    fragments.push(
      this.createCodeFragment(
        `${node.id}_import`,
        'import',
        this.generateImport(config.packageName, config.imports),
        [config.packageName],
        node.id,
        1
      )
    );

    // Generate the memory instantiation
    const instantiation = this.generateMemoryInstantiation(
      variableName,
      config.className,
      config.config
    );

    // Declaration fragment
    fragments.push(
      this.createCodeFragment(
        `${node.id}_declaration`,
        'declaration',
        instantiation,
        [],
        node.id,
        2,
        { exports: [variableName] }
      )
    );

    return fragments;
  }

  protected generateMemoryInstantiation(
    variableName: string,
    className: string,
    config: Record<string, unknown>
  ): string {
    const configEntries = Object.entries(config)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `  ${key}: ${this.formatParameterValue(value)}`)
      .join(',\n');

    if (configEntries.length === 0) {
      return `const ${variableName} = new ${className}();`;
    }

    return `const ${variableName} = new ${className}({\n${configEntries}\n});`;
  }
}

/**
 * Buffer Memory Converter
 */
export class BufferMemoryConverter extends BaseMemoryConverter {
  readonly flowiseType = 'bufferMemory';

  protected getRequiredImports(): string[] {
    return ['BufferMemory'];
  }

  protected getPackageName(): string {
    return '@langchain/core/memory';
  }

  protected getClassName(): string {
    return 'BufferMemory';
  }

  getDependencies(): string[] {
    return ['@langchain/core'];
  }

  protected extractMemoryConfig(node: IRNode): Record<string, unknown> {
    const memoryKey = this.getParameterValue<string>(
      node,
      'memoryKey',
      'history'
    );
    const inputKey = this.getParameterValue<string>(node, 'inputKey', 'input');
    const outputKey = this.getParameterValue<string>(
      node,
      'outputKey',
      'output'
    );
    const returnMessages = this.getParameterValue<boolean>(
      node,
      'returnMessages',
      false
    );
    const humanPrefix = this.getParameterValue<string>(
      node,
      'humanPrefix',
      'Human'
    );
    const aiPrefix = this.getParameterValue<string>(node, 'aiPrefix', 'AI');

    return {
      memoryKey,
      inputKey,
      outputKey,
      returnMessages,
      humanPrefix,
      aiPrefix,
    };
  }
}

/**
 * Buffer Window Memory Converter
 */
export class BufferWindowMemoryConverter extends BaseMemoryConverter {
  readonly flowiseType = 'bufferWindowMemory';

  protected getRequiredImports(): string[] {
    return ['BufferWindowMemory'];
  }

  protected getPackageName(): string {
    return '@langchain/core/memory';
  }

  protected getClassName(): string {
    return 'BufferWindowMemory';
  }

  getDependencies(): string[] {
    return ['@langchain/core'];
  }

  protected extractMemoryConfig(node: IRNode): Record<string, unknown> {
    const k = this.getParameterValue<number>(node, 'k', 5);
    const memoryKey = this.getParameterValue<string>(
      node,
      'memoryKey',
      'history'
    );
    const inputKey = this.getParameterValue<string>(node, 'inputKey', 'input');
    const outputKey = this.getParameterValue<string>(
      node,
      'outputKey',
      'output'
    );
    const returnMessages = this.getParameterValue<boolean>(
      node,
      'returnMessages',
      false
    );
    const humanPrefix = this.getParameterValue<string>(
      node,
      'humanPrefix',
      'Human'
    );
    const aiPrefix = this.getParameterValue<string>(node, 'aiPrefix', 'AI');

    return {
      k,
      memoryKey,
      inputKey,
      outputKey,
      returnMessages,
      humanPrefix,
      aiPrefix,
    };
  }
}

/**
 * Summary Buffer Memory Converter
 */
export class SummaryBufferMemoryConverter extends BaseMemoryConverter {
  readonly flowiseType = 'summaryBufferMemory';

  protected getRequiredImports(): string[] {
    return ['ConversationSummaryBufferMemory'];
  }

  protected getPackageName(): string {
    return '@langchain/core/memory';
  }

  protected getClassName(): string {
    return 'ConversationSummaryBufferMemory';
  }

  getDependencies(): string[] {
    return ['@langchain/core'];
  }

  protected extractMemoryConfig(node: IRNode): Record<string, unknown> {
    const maxTokenLimit = this.getParameterValue<number>(
      node,
      'maxTokenLimit',
      2000
    );
    const memoryKey = this.getParameterValue<string>(
      node,
      'memoryKey',
      'history'
    );
    const inputKey = this.getParameterValue<string>(node, 'inputKey', 'input');
    const outputKey = this.getParameterValue<string>(
      node,
      'outputKey',
      'output'
    );
    const returnMessages = this.getParameterValue<boolean>(
      node,
      'returnMessages',
      false
    );
    const humanPrefix = this.getParameterValue<string>(
      node,
      'humanPrefix',
      'Human'
    );
    const aiPrefix = this.getParameterValue<string>(node, 'aiPrefix', 'AI');

    return {
      maxTokenLimit,
      memoryKey,
      inputKey,
      outputKey,
      returnMessages,
      humanPrefix,
      aiPrefix,
    };
  }

  protected generateMemoryInstantiation(
    variableName: string,
    className: string,
    config: Record<string, unknown>
  ): string {
    // Summary buffer memory needs an LLM reference
    const configEntries = Object.entries(config)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `  ${key}: ${this.formatParameterValue(value)}`)
      .join(',\n');

    const llmComment = '  // llm: will be provided by connection resolution';

    return `const ${variableName} = new ${className}({\n${llmComment}\n${configEntries}\n});`;
  }
}

/**
 * Vector Store Retriever Memory Converter
 */
export class VectorStoreRetrieverMemoryConverter extends BaseMemoryConverter {
  readonly flowiseType = 'vectorStoreRetrieverMemory';

  protected getRequiredImports(): string[] {
    return ['VectorStoreRetrieverMemory'];
  }

  protected getPackageName(): string {
    return '@langchain/core/memory';
  }

  protected getClassName(): string {
    return 'VectorStoreRetrieverMemory';
  }

  getDependencies(): string[] {
    return ['@langchain/core'];
  }

  protected extractMemoryConfig(node: IRNode): Record<string, unknown> {
    const memoryKey = this.getParameterValue<string>(
      node,
      'memoryKey',
      'history'
    );
    const inputKey = this.getParameterValue<string>(node, 'inputKey', 'input');
    const outputKey = this.getParameterValue<string>(
      node,
      'outputKey',
      'output'
    );
    const returnDocs = this.getParameterValue<boolean>(
      node,
      'returnDocs',
      false
    );

    return {
      memoryKey,
      inputKey,
      outputKey,
      returnDocs,
    };
  }

  protected generateMemoryInstantiation(
    variableName: string,
    className: string,
    config: Record<string, unknown>
  ): string {
    // Vector store retriever memory needs a retriever reference
    const configEntries = Object.entries(config)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `  ${key}: ${this.formatParameterValue(value)}`)
      .join(',\n');

    const retrieverComment =
      '  // retriever: will be provided by connection resolution';

    return `const ${variableName} = new ${className}({\n${retrieverComment}\n${configEntries}\n});`;
  }
}

/**
 * Conversation Summary Memory Converter
 */
export class ConversationSummaryMemoryConverter extends BaseMemoryConverter {
  readonly flowiseType = 'conversationSummaryMemory';

  protected getRequiredImports(): string[] {
    return ['ConversationSummaryMemory'];
  }

  protected getPackageName(): string {
    return '@langchain/core/memory';
  }

  protected getClassName(): string {
    return 'ConversationSummaryMemory';
  }

  getDependencies(): string[] {
    return ['@langchain/core'];
  }

  protected extractMemoryConfig(node: IRNode): Record<string, unknown> {
    const memoryKey = this.getParameterValue<string>(
      node,
      'memoryKey',
      'history'
    );
    const inputKey = this.getParameterValue<string>(node, 'inputKey', 'input');
    const outputKey = this.getParameterValue<string>(
      node,
      'outputKey',
      'output'
    );
    const returnMessages = this.getParameterValue<boolean>(
      node,
      'returnMessages',
      false
    );
    const humanPrefix = this.getParameterValue<string>(
      node,
      'humanPrefix',
      'Human'
    );
    const aiPrefix = this.getParameterValue<string>(node, 'aiPrefix', 'AI');

    return {
      memoryKey,
      inputKey,
      outputKey,
      returnMessages,
      humanPrefix,
      aiPrefix,
    };
  }

  protected generateMemoryInstantiation(
    variableName: string,
    className: string,
    config: Record<string, unknown>
  ): string {
    // Conversation summary memory needs an LLM reference
    const configEntries = Object.entries(config)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `  ${key}: ${this.formatParameterValue(value)}`)
      .join(',\n');

    const llmComment = '  // llm: will be provided by connection resolution';

    return `const ${variableName} = new ${className}({\n${llmComment}\n${configEntries}\n});`;
  }
}

/**
 * Entity Memory Converter
 */
export class EntityMemoryConverter extends BaseMemoryConverter {
  readonly flowiseType = 'entityMemory';

  protected getRequiredImports(): string[] {
    return ['EntityMemory'];
  }

  protected getPackageName(): string {
    return '@langchain/core/memory';
  }

  protected getClassName(): string {
    return 'EntityMemory';
  }

  getDependencies(): string[] {
    return ['@langchain/core'];
  }

  protected extractMemoryConfig(node: IRNode): Record<string, unknown> {
    const memoryKey = this.getParameterValue<string>(
      node,
      'memoryKey',
      'entities'
    );
    const inputKey = this.getParameterValue<string>(node, 'inputKey', 'input');
    const outputKey = this.getParameterValue<string>(
      node,
      'outputKey',
      'output'
    );
    const entityExtractionPrompt = this.getParameterValue<string>(
      node,
      'entityExtractionPrompt'
    );
    const entitySummarizationPrompt = this.getParameterValue<string>(
      node,
      'entitySummarizationPrompt'
    );
    const k = this.getParameterValue<number>(node, 'k', 3);

    return {
      memoryKey,
      inputKey,
      outputKey,
      k,
      ...(entityExtractionPrompt && { entityExtractionPrompt }),
      ...(entitySummarizationPrompt && { entitySummarizationPrompt }),
    };
  }

  protected generateMemoryInstantiation(
    variableName: string,
    className: string,
    config: Record<string, unknown>
  ): string {
    // Entity memory needs an LLM reference
    const configEntries = Object.entries(config)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `  ${key}: ${this.formatParameterValue(value)}`)
      .join(',\n');

    const llmComment = '  // llm: will be provided by connection resolution';

    return `const ${variableName} = new ${className}({\n${llmComment}\n${configEntries}\n});`;
  }
}

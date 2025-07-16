/**
 * Vector Store Converters
 * 
 * Converters for various vector store types including Pinecone, Chroma, FAISS, etc.
 */

import { IRNode, CodeFragment, GenerationContext } from '../../ir/types.js';
import { BaseConverter } from '../registry.js';

/**
 * Base Vector Store converter with common functionality
 */
abstract class BaseVectorStoreConverter extends BaseConverter {
  readonly category = 'vectorstore';
  
  protected generateVectorStoreConfiguration(node: IRNode, context: GenerationContext): {
    imports: string[];
    packageName: string;
    className: string;
    config: Record<string, unknown>;
  } {
    return {
      imports: this.getRequiredImports(),
      packageName: this.getPackageName(),
      className: this.getClassName(),
      config: this.extractVectorStoreConfig(node)
    };
  }
  
  protected abstract getRequiredImports(): string[];
  protected abstract getPackageName(): string;
  protected abstract getClassName(): string;
  protected abstract extractVectorStoreConfig(node: IRNode): Record<string, unknown>;
  
  convert(node: IRNode, context: GenerationContext): CodeFragment[] {
    const variableName = this.generateVariableName(node, 'vectorstore');
    const config = this.generateVectorStoreConfiguration(node, context);
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
    
    // Configuration fragment
    const configStr = this.generateConfigurationString(config.config);
    const initCode = configStr 
      ? `const ${variableName} = new ${config.className}(${configStr});`
      : `const ${variableName} = new ${config.className}();`;
    
    fragments.push(this.createCodeFragment(
      `${node.id}_init`,
      'initialization',
      initCode,
      [config.className],
      node.id,
      150
    ));
    
    return fragments;
  }
  
  protected generateConfigurationString(config: Record<string, unknown>): string {
    const entries = Object.entries(config);
    if (entries.length === 0) return '';
    
    const configPairs = entries.map(([key, value]) => {
      return `${key}: ${this.formatParameterValue(value)}`;
    });
    
    return `{\n  ${configPairs.join(',\n  ')}\n}`;
  }
}

/**
 * Pinecone Vector Store Converter
 */
export class PineconeConverter extends BaseVectorStoreConverter {
  readonly flowiseType = 'pinecone';
  
  protected getRequiredImports(): string[] {
    return ['PineconeStore'];
  }
  
  protected getPackageName(): string {
    return '@langchain/community/vectorstores/pinecone';
  }
  
  protected getClassName(): string {
    return 'PineconeStore';
  }
  
  protected extractVectorStoreConfig(node: IRNode): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    
    const apiKey = this.getParameterValue(node, 'apiKey');
    if (apiKey) {
      config.apiKey = apiKey;
    } else {
      config.apiKey = 'process.env.PINECONE_API_KEY';
    }
    
    const environment = this.getParameterValue(node, 'environment');
    if (environment) {
      config.environment = environment;
    } else {
      config.environment = 'process.env.PINECONE_ENVIRONMENT';
    }
    
    const indexName = this.getParameterValue(node, 'indexName');
    if (indexName) {
      config.indexName = indexName;
    }
    
    return config;
  }
  
  getDependencies(): string[] {
    return ['@langchain/community/vectorstores/pinecone', '@pinecone-database/pinecone'];
  }
  
  getSupportedVersions(): string[] {
    return ['0.2.0', '0.2.1', '0.2.2'];
  }
}

/**
 * Chroma Vector Store Converter
 */
export class ChromaConverter extends BaseVectorStoreConverter {
  readonly flowiseType = 'chroma';
  
  protected getRequiredImports(): string[] {
    return ['Chroma'];
  }
  
  protected getPackageName(): string {
    return '@langchain/community/vectorstores/chroma';
  }
  
  protected getClassName(): string {
    return 'Chroma';
  }
  
  protected extractVectorStoreConfig(node: IRNode): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    
    const url = this.getParameterValue(node, 'url', 'http://localhost:8000');
    config.url = url;
    
    const collectionName = this.getParameterValue(node, 'collectionName');
    if (collectionName) {
      config.collectionName = collectionName;
    }
    
    const collectionMetadata = this.getParameterValue(node, 'collectionMetadata');
    if (collectionMetadata) {
      config.collectionMetadata = collectionMetadata;
    }
    
    return config;
  }
  
  getDependencies(): string[] {
    return ['@langchain/community/vectorstores/chroma', 'chromadb'];
  }
  
  getSupportedVersions(): string[] {
    return ['0.2.0', '0.2.1', '0.2.2'];
  }
}

/**
 * FAISS Vector Store Converter
 */
export class FAISSConverter extends BaseVectorStoreConverter {
  readonly flowiseType = 'faiss';
  
  protected getRequiredImports(): string[] {
    return ['FaissStore'];
  }
  
  protected getPackageName(): string {
    return '@langchain/community/vectorstores/faiss';
  }
  
  protected getClassName(): string {
    return 'FaissStore';
  }
  
  protected extractVectorStoreConfig(node: IRNode): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    
    const directory = this.getParameterValue(node, 'directory');
    if (directory) {
      config.directory = directory;
    }
    
    return config;
  }
  
  getDependencies(): string[] {
    return ['@langchain/community/vectorstores/faiss', 'faiss-node'];
  }
  
  getSupportedVersions(): string[] {
    return ['0.2.0', '0.2.1', '0.2.2'];
  }
}

/**
 * MemoryVectorStore Converter
 */
export class MemoryVectorStoreConverter extends BaseVectorStoreConverter {
  readonly flowiseType = 'memoryVectorStore';
  
  protected getRequiredImports(): string[] {
    return ['MemoryVectorStore'];
  }
  
  protected getPackageName(): string {
    return 'langchain/vectorstores/memory';
  }
  
  protected getClassName(): string {
    return 'MemoryVectorStore';
  }
  
  protected extractVectorStoreConfig(node: IRNode): Record<string, unknown> {
    // MemoryVectorStore doesn't require configuration
    return {};
  }
  
  getDependencies(): string[] {
    return ['langchain/vectorstores/memory'];
  }
  
  getSupportedVersions(): string[] {
    return ['0.2.0', '0.2.1', '0.2.2'];
  }
}

/**
 * Supabase Vector Store Converter
 */
export class SupabaseConverter extends BaseVectorStoreConverter {
  readonly flowiseType = 'supabase';
  
  protected getRequiredImports(): string[] {
    return ['SupabaseVectorStore'];
  }
  
  protected getPackageName(): string {
    return '@langchain/community/vectorstores/supabase';
  }
  
  protected getClassName(): string {
    return 'SupabaseVectorStore';
  }
  
  protected extractVectorStoreConfig(node: IRNode): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    
    const supabaseUrl = this.getParameterValue(node, 'supabaseUrl');
    if (supabaseUrl) {
      config.supabaseUrl = supabaseUrl;
    } else {
      config.supabaseUrl = 'process.env.SUPABASE_URL';
    }
    
    const supabaseKey = this.getParameterValue(node, 'supabaseKey');
    if (supabaseKey) {
      config.supabaseKey = supabaseKey;
    } else {
      config.supabaseKey = 'process.env.SUPABASE_SERVICE_ROLE_KEY';
    }
    
    const tableName = this.getParameterValue(node, 'tableName', 'documents');
    config.tableName = tableName;
    
    return config;
  }
  
  getDependencies(): string[] {
    return ['@langchain/community/vectorstores/supabase', '@supabase/supabase-js'];
  }
  
  getSupportedVersions(): string[] {
    return ['0.2.0', '0.2.1', '0.2.2'];
  }
}
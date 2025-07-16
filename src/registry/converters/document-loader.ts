/**
 * Document Loader Converters
 * 
 * Converters for various document loader types including PDF, CSV, JSON, etc.
 */

import { IRNode, CodeFragment, GenerationContext } from '../../ir/types.js';
import { BaseConverter } from '../registry.js';

/**
 * Base Document Loader converter with common functionality
 */
abstract class BaseDocumentLoaderConverter extends BaseConverter {
  readonly category = 'documentloader';
  
  protected generateDocumentLoaderConfiguration(node: IRNode, context: GenerationContext): {
    imports: string[];
    packageName: string;
    className: string;
    config: Record<string, unknown>;
  } {
    return {
      imports: this.getRequiredImports(),
      packageName: this.getPackageName(),
      className: this.getClassName(),
      config: this.extractDocumentLoaderConfig(node)
    };
  }
  
  protected abstract getRequiredImports(): string[];
  protected abstract getPackageName(): string;
  protected abstract getClassName(): string;
  protected abstract extractDocumentLoaderConfig(node: IRNode): Record<string, unknown>;
  
  convert(node: IRNode, context: GenerationContext): CodeFragment[] {
    const variableName = this.generateVariableName(node, 'loader');
    const config = this.generateDocumentLoaderConfiguration(node, context);
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
      130
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
 * PDF Loader Converter
 */
export class PDFLoaderConverter extends BaseDocumentLoaderConverter {
  readonly flowiseType = 'pdfLoader';
  
  protected getRequiredImports(): string[] {
    return ['PDFLoader'];
  }
  
  protected getPackageName(): string {
    return '@langchain/community/document_loaders/fs/pdf';
  }
  
  protected getClassName(): string {
    return 'PDFLoader';
  }
  
  protected extractDocumentLoaderConfig(node: IRNode): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    
    const filePath = this.getParameterValue(node, 'filePath');
    if (filePath) {
      config.filePath = filePath;
    }
    
    const splitPages = this.getParameterValue(node, 'splitPages', true);
    if (splitPages !== undefined) {
      config.splitPages = splitPages;
    }
    
    return config;
  }
  
  getDependencies(): string[] {
    return ['@langchain/community/document_loaders/fs/pdf', 'pdf-parse'];
  }
  
  getSupportedVersions(): string[] {
    return ['0.2.0', '0.2.1', '0.2.2'];
  }
}

/**
 * CSV Loader Converter
 */
export class CSVLoaderConverter extends BaseDocumentLoaderConverter {
  readonly flowiseType = 'csvLoader';
  
  protected getRequiredImports(): string[] {
    return ['CSVLoader'];
  }
  
  protected getPackageName(): string {
    return '@langchain/community/document_loaders/fs/csv';
  }
  
  protected getClassName(): string {
    return 'CSVLoader';
  }
  
  protected extractDocumentLoaderConfig(node: IRNode): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    
    const filePath = this.getParameterValue(node, 'filePath');
    if (filePath) {
      config.filePath = filePath;
    }
    
    const column = this.getParameterValue(node, 'column');
    if (column) {
      config.column = column;
    }
    
    const separator = this.getParameterValue(node, 'separator', ',');
    if (separator) {
      config.separator = separator;
    }
    
    return config;
  }
  
  getDependencies(): string[] {
    return ['@langchain/community/document_loaders/fs/csv', 'csv-parser'];
  }
  
  getSupportedVersions(): string[] {
    return ['0.2.0', '0.2.1', '0.2.2'];
  }
}

/**
 * JSON Loader Converter
 */
export class JSONLoaderConverter extends BaseDocumentLoaderConverter {
  readonly flowiseType = 'jsonLoader';
  
  protected getRequiredImports(): string[] {
    return ['JSONLoader'];
  }
  
  protected getPackageName(): string {
    return '@langchain/community/document_loaders/fs/json';
  }
  
  protected getClassName(): string {
    return 'JSONLoader';
  }
  
  protected extractDocumentLoaderConfig(node: IRNode): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    
    const filePath = this.getParameterValue(node, 'filePath');
    if (filePath) {
      config.filePath = filePath;
    }
    
    const pointers = this.getParameterValue(node, 'pointers');
    if (pointers) {
      config.pointers = pointers;
    }
    
    return config;
  }
  
  getDependencies(): string[] {
    return ['@langchain/community/document_loaders/fs/json'];
  }
  
  getSupportedVersions(): string[] {
    return ['0.2.0', '0.2.1', '0.2.2'];
  }
}

/**
 * Text Loader Converter
 */
export class TextLoaderConverter extends BaseDocumentLoaderConverter {
  readonly flowiseType = 'textLoader';
  
  protected getRequiredImports(): string[] {
    return ['TextLoader'];
  }
  
  protected getPackageName(): string {
    return '@langchain/community/document_loaders/fs/text';
  }
  
  protected getClassName(): string {
    return 'TextLoader';
  }
  
  protected extractDocumentLoaderConfig(node: IRNode): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    
    const filePath = this.getParameterValue(node, 'filePath');
    if (filePath) {
      config.filePath = filePath;
    }
    
    const encoding = this.getParameterValue(node, 'encoding', 'utf8');
    if (encoding) {
      config.encoding = encoding;
    }
    
    return config;
  }
  
  getDependencies(): string[] {
    return ['@langchain/community/document_loaders/fs/text'];
  }
  
  getSupportedVersions(): string[] {
    return ['0.2.0', '0.2.1', '0.2.2'];
  }
}

/**
 * Docx Loader Converter
 */
export class DocxLoaderConverter extends BaseDocumentLoaderConverter {
  readonly flowiseType = 'docxLoader';
  
  protected getRequiredImports(): string[] {
    return ['DocxLoader'];
  }
  
  protected getPackageName(): string {
    return '@langchain/community/document_loaders/fs/docx';
  }
  
  protected getClassName(): string {
    return 'DocxLoader';
  }
  
  protected extractDocumentLoaderConfig(node: IRNode): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    
    const filePath = this.getParameterValue(node, 'filePath');
    if (filePath) {
      config.filePath = filePath;
    }
    
    return config;
  }
  
  getDependencies(): string[] {
    return ['@langchain/community/document_loaders/fs/docx', 'mammoth'];
  }
  
  getSupportedVersions(): string[] {
    return ['0.2.0', '0.2.1', '0.2.2'];
  }
}

/**
 * Directory Loader Converter
 */
export class DirectoryLoaderConverter extends BaseDocumentLoaderConverter {
  readonly flowiseType = 'directoryLoader';
  
  protected getRequiredImports(): string[] {
    return ['DirectoryLoader'];
  }
  
  protected getPackageName(): string {
    return '@langchain/community/document_loaders/fs/directory';
  }
  
  protected getClassName(): string {
    return 'DirectoryLoader';
  }
  
  protected extractDocumentLoaderConfig(node: IRNode): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    
    const directoryPath = this.getParameterValue(node, 'directoryPath');
    if (directoryPath) {
      config.directoryPath = directoryPath;
    }
    
    const extensions = this.getParameterValue(node, 'extensions', ['.txt']);
    if (extensions) {
      config.extensions = extensions;
    }
    
    const recursive = this.getParameterValue(node, 'recursive', true);
    if (recursive !== undefined) {
      config.recursive = recursive;
    }
    
    return config;
  }
  
  getDependencies(): string[] {
    return ['@langchain/community/document_loaders/fs/directory'];
  }
  
  getSupportedVersions(): string[] {
    return ['0.2.0', '0.2.1', '0.2.2'];
  }
}

/**
 * Web Loader Converter
 */
export class WebLoaderConverter extends BaseDocumentLoaderConverter {
  readonly flowiseType = 'webLoader';
  
  protected getRequiredImports(): string[] {
    return ['CheerioWebBaseLoader'];
  }
  
  protected getPackageName(): string {
    return '@langchain/community/document_loaders/web/cheerio';
  }
  
  protected getClassName(): string {
    return 'CheerioWebBaseLoader';
  }
  
  protected extractDocumentLoaderConfig(node: IRNode): Record<string, unknown> {
    const config: Record<string, unknown> = {};
    
    const webPath = this.getParameterValue(node, 'webPath');
    if (webPath) {
      config.webPath = webPath;
    }
    
    const selector = this.getParameterValue(node, 'selector');
    if (selector) {
      config.selector = selector;
    }
    
    return config;
  }
  
  getDependencies(): string[] {
    return ['@langchain/community/document_loaders/web/cheerio', 'cheerio'];
  }
  
  getSupportedVersions(): string[] {
    return ['0.2.0', '0.2.1', '0.2.2'];
  }
}
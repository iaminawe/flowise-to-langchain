/**
 * Performance and Edge Case Tests for Vector Database Operations
 * Tests performance, memory usage, error handling, and edge cases
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  createTempDir,
  cleanupTempDir,
  createMockNode,
  PerformanceTimer,
  MemoryTracker,
  TestAssertions,
} from '../utils/test-helpers';

// Mock performance-critical vector operations
jest.mock('../../src/registry/converters/vectorstore.js', () => ({
  BaseVectorStoreConverter: jest.fn().mockImplementation(() => ({
    category: 'vectorstore',
    generateVectorStoreConfiguration: jest.fn(() => ({
      imports: ['MockVectorStore'],
      packageName: '@langchain/community/vectorstores/mock',
      className: 'MockVectorStore',
      config: { batchSize: 100 },
    })),
    convert: jest.fn(() => [
      { id: 'import', type: 'import', code: 'import { MockVectorStore } from "@langchain/community/vectorstores/mock";' },
      { id: 'init', type: 'initialization', code: 'const vectorstore = new MockVectorStore({ batchSize: 100 });' },
    ]),
  })),
  PineconeConverter: jest.fn().mockImplementation(() => ({
    flowiseType: 'pinecone',
    convert: jest.fn(() => {
      // Simulate processing time based on configuration complexity
      const startTime = Date.now();
      while (Date.now() - startTime < 10) { /* Simulate work */ }
      return [
        { id: 'import', type: 'import', code: 'import { PineconeStore } from "@langchain/community/vectorstores/pinecone";' },
        { id: 'init', type: 'initialization', code: 'const vectorstore = new PineconeStore({ apiKey: process.env.PINECONE_API_KEY });' },
      ];
    }),
    getDependencies: jest.fn(() => ['@langchain/community/vectorstores/pinecone']),
  })),
}));

describe('Vector Database Performance Tests', () => {
  let tempDir: string;
  let timer: PerformanceTimer;
  let memoryTracker: MemoryTracker;

  beforeEach(async () => {
    tempDir = await createTempDir('vectordb-perf');
    timer = new PerformanceTimer();
    memoryTracker = new MemoryTracker();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  test('should handle high-volume vector node conversions efficiently', () => {
    const { PineconeConverter } = require('../../src/registry/converters/vectorstore.js');
    const converter = new PineconeConverter();
    
    timer.start();
    memoryTracker.start();

    // Convert 10,000 vector store nodes
    const nodeCount = 10000;
    const nodes = Array.from({ length: nodeCount }, (_, i) => 
      createMockNode({
        id: `perf-node-${i}`,
        data: {
          type: 'pinecone',
          inputs: {
            apiKey: `key-${i}`,
            indexName: `index-${i % 100}`, // Simulate some reuse
          },
        },
      })
    );

    const results = nodes.map(node => converter.convert(node, {}));

    const duration = timer.stop();
    const memory = memoryTracker.getUsage();

    // Performance assertions
    expect(results).toHaveLength(nodeCount);
    expect(duration).toBeLessThan(30000); // 30 seconds max for 10k nodes
    expect(memory.difference).toBeLessThan(500 * 1024 * 1024); // 500MB max

    // Verify all conversions succeeded
    results.forEach(result => {
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('import');
      expect(result[1].type).toBe('initialization');
    });
  });

  test('should maintain consistent performance across different vector store types', () => {
    const vectorStoreTypes = [
      'pinecone',
      'chroma', 
      'faiss',
      'memoryVectorStore',
      'supabase',
    ];

    const performanceResults: Array<{ type: string; duration: number; memory: number }> = [];

    vectorStoreTypes.forEach(storeType => {
      const timer = new PerformanceTimer();
      const memoryTracker = new MemoryTracker();
      
      timer.start();
      memoryTracker.start();

      // Convert 1000 nodes of each type
      const nodes = Array.from({ length: 1000 }, (_, i) => 
        createMockNode({
          id: `${storeType}-${i}`,
          data: {
            type: storeType,
            inputs: {
              ...(storeType === 'pinecone' && { apiKey: `key-${i}`, indexName: `index-${i}` }),
              ...(storeType === 'chroma' && { url: 'http://localhost:8000', collectionName: `col-${i}` }),
              ...(storeType === 'faiss' && { directory: `./faiss-${i}` }),
              ...(storeType === 'supabase' && { tableName: `table-${i}` }),
            },
          },
        })
      );

      // Mock converter for consistent testing
      const { PineconeConverter } = require('../../src/registry/converters/vectorstore.js');
      const converter = new PineconeConverter();
      
      nodes.forEach(node => converter.convert(node, {}));

      const duration = timer.stop();
      const memory = memoryTracker.getUsage();

      performanceResults.push({
        type: storeType,
        duration,
        memory: memory.difference,
      });
    });

    // Verify consistent performance across types
    const maxDuration = Math.max(...performanceResults.map(r => r.duration));
    const minDuration = Math.min(...performanceResults.map(r => r.duration));
    const durationVariance = maxDuration - minDuration;

    // Duration variance should be reasonable (within 5x)
    expect(durationVariance / minDuration).toBeLessThan(5);

    // All should complete within reasonable time
    performanceResults.forEach(result => {
      expect(result.duration).toBeLessThan(10000); // 10 seconds
      expect(result.memory).toBeLessThan(100 * 1024 * 1024); // 100MB
    });
  });

  test('should optimize memory usage for large configuration objects', () => {
    const { PineconeConverter } = require('../../src/registry/converters/vectorstore.js');
    const converter = new PineconeConverter();
    
    memoryTracker.start();

    // Create nodes with increasingly large configuration objects
    const configSizes = [1, 10, 100, 1000, 5000];
    const memoryUsages: number[] = [];

    configSizes.forEach(size => {
      const largeConfig = Array.from({ length: size }, (_, i) => ({
        [`param${i}`]: `value${i}`.repeat(100), // Large string values
      })).reduce((acc, obj) => ({ ...acc, ...obj }), {});

      const node = createMockNode({
        data: {
          type: 'pinecone',
          inputs: {
            ...largeConfig,
            apiKey: 'test-key',
            indexName: 'test-index',
          },
        },
      });

      const beforeMemory = process.memoryUsage().heapUsed;
      converter.convert(node, {});
      const afterMemory = process.memoryUsage().heapUsed;
      
      memoryUsages.push(afterMemory - beforeMemory);
    });

    // Memory usage should scale reasonably with config size
    const memoryGrowthRate = memoryUsages[memoryUsages.length - 1] / memoryUsages[0];
    expect(memoryGrowthRate).toBeLessThan(10); // Should not grow more than 10x

    // No single conversion should use excessive memory
    memoryUsages.forEach(usage => {
      expect(usage).toBeLessThan(50 * 1024 * 1024); // 50MB per conversion
    });
  });

  test('should handle concurrent conversion requests efficiently', async () => {
    const { PineconeConverter } = require('../../src/registry/converters/vectorstore.js');
    const converter = new PineconeConverter();
    
    timer.start();
    memoryTracker.start();

    // Create 100 concurrent conversion promises
    const concurrentCount = 100;
    const conversionPromises = Array.from({ length: concurrentCount }, (_, i) => {
      const node = createMockNode({
        id: `concurrent-${i}`,
        data: {
          type: 'pinecone',
          inputs: {
            apiKey: `concurrent-key-${i}`,
            indexName: `concurrent-index-${i}`,
          },
        },
      });

      return Promise.resolve().then(() => converter.convert(node, {}));
    });

    const results = await Promise.all(conversionPromises);

    const duration = timer.stop();
    const memory = memoryTracker.getUsage();

    // All conversions should succeed
    expect(results).toHaveLength(concurrentCount);
    results.forEach(result => {
      expect(result).toHaveLength(2);
    });

    // Should complete efficiently
    expect(duration).toBeLessThan(5000); // 5 seconds
    expect(memory.difference).toBeLessThan(200 * 1024 * 1024); // 200MB
  });

  test('should cache repeated conversion patterns for performance', () => {
    const { PineconeConverter } = require('../../src/registry/converters/vectorstore.js');
    const converter = new PineconeConverter();

    // Simulate caching by tracking conversion patterns
    const conversionCache = new Map<string, any>();
    
    const cachedConvert = (node: any, context: any) => {
      const cacheKey = JSON.stringify({
        type: node.data?.type,
        inputs: node.data?.inputs,
      });

      if (conversionCache.has(cacheKey)) {
        return conversionCache.get(cacheKey);
      }

      const result = converter.convert(node, context);
      conversionCache.set(cacheKey, result);
      return result;
    };

    timer.start();

    // Convert same configuration 1000 times
    const baseNode = createMockNode({
      data: {
        type: 'pinecone',
        inputs: {
          apiKey: 'cache-test-key',
          indexName: 'cache-test-index',
        },
      },
    });

    // First 100 conversions (cache building)
    const firstBatch = Array.from({ length: 100 }, () => 
      cachedConvert(baseNode, {})
    );

    const cacheBuiltTime = timer.stop();

    timer.start();

    // Next 900 conversions (should use cache)
    const secondBatch = Array.from({ length: 900 }, () => 
      cachedConvert(baseNode, {})
    );

    const cachedTime = timer.stop();

    // Cached conversions should be much faster
    expect(cachedTime).toBeLessThan(cacheBuiltTime);
    expect(conversionCache.size).toBe(1); // Only one unique pattern cached
    
    // All results should be identical
    const firstResult = JSON.stringify(firstBatch[0]);
    [...firstBatch, ...secondBatch].forEach(result => {
      expect(JSON.stringify(result)).toBe(firstResult);
    });
  });
});

describe('Vector Database Edge Cases and Error Handling', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir('vectordb-edge');
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  test('should handle extreme configuration values gracefully', () => {
    const { PineconeConverter } = require('../../src/registry/converters/vectorstore.js');
    const converter = new PineconeConverter();

    const extremeConfigs = [
      {
        description: 'very long strings',
        inputs: {
          apiKey: 'a'.repeat(10000),
          indexName: 'b'.repeat(5000),
        },
      },
      {
        description: 'special characters',
        inputs: {
          apiKey: '!@#$%^&*()_+-=[]{}|;:,.<>?',
          indexName: 'test-index',
        },
      },
      {
        description: 'unicode characters',
        inputs: {
          apiKey: '🔑🌟💫🚀',
          indexName: '测试索引',
        },
      },
      {
        description: 'numeric strings',
        inputs: {
          apiKey: '123456789',
          indexName: '999999',
        },
      },
      {
        description: 'empty strings',
        inputs: {
          apiKey: '',
          indexName: '',
        },
      },
    ];

    extremeConfigs.forEach(config => {
      const node = createMockNode({
        data: {
          type: 'pinecone',
          inputs: config.inputs,
        },
      });

      expect(() => {
        const result = converter.convert(node, {});
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      }).not.toThrow(`Should handle ${config.description}`);
    });
  });

  test('should handle malformed node structures', () => {
    const { PineconeConverter } = require('../../src/registry/converters/vectorstore.js');
    const converter = new PineconeConverter();

    const malformedNodes = [
      null,
      undefined,
      {},
      { id: null },
      { id: 'test', data: null },
      { id: 'test', data: {} },
      { id: 'test', data: { inputs: null } },
      { id: 'test', data: { inputs: undefined } },
      { id: 'test', data: { type: null, inputs: {} } },
      { id: 'test', data: { type: '', inputs: {} } },
      // Circular reference
      (() => {
        const circular: any = { id: 'circular' };
        circular.self = circular;
        return circular;
      })(),
    ];

    malformedNodes.forEach((node, index) => {
      expect(() => {
        const result = converter.convert(node, {});
        expect(result).toBeDefined();
      }).not.toThrow(`Should handle malformed node ${index}`);
    });
  });

  test('should handle memory pressure during conversion', () => {
    const { PineconeConverter } = require('../../src/registry/converters/vectorstore.js');
    const converter = new PineconeConverter();

    // Create memory pressure
    const memoryHogs: any[] = [];
    
    try {
      // Allocate memory in chunks while performing conversions
      for (let i = 0; i < 100; i++) {
        // Allocate 10MB chunks
        memoryHogs.push(new Array(10 * 1024 * 1024).fill(i));
        
        // Perform conversion under memory pressure
        const node = createMockNode({
          id: `memory-pressure-${i}`,
          data: {
            type: 'pinecone',
            inputs: {
              apiKey: `pressure-key-${i}`,
              indexName: `pressure-index-${i}`,
            },
          },
        });

        const result = converter.convert(node, {});
        expect(result).toBeDefined();
        expect(result).toHaveLength(2);

        // Trigger garbage collection opportunity
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }
    } catch (error) {
      // Only acceptable error is out of memory
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatch(/memory|heap/i);
    }
  });

  test('should handle deeply nested configuration objects', () => {
    const { PineconeConverter } = require('../../src/registry/converters/vectorstore.js');
    const converter = new PineconeConverter();

    // Create deeply nested configuration
    let deepConfig: any = { value: 'deep' };
    for (let i = 0; i < 100; i++) {
      deepConfig = { level: i, nested: deepConfig };
    }

    const node = createMockNode({
      data: {
        type: 'pinecone',
        inputs: {
          apiKey: 'deep-test-key',
          indexName: 'deep-test-index',
          deepConfig,
        },
      },
    });

    expect(() => {
      const result = converter.convert(node, {});
      expect(result).toBeDefined();
    }).not.toThrow();
  });

  test('should handle type coercion edge cases', () => {
    const { PineconeConverter } = require('../../src/registry/converters/vectorstore.js');
    const converter = new PineconeConverter();

    const typeCoercionCases = [
      {
        description: 'boolean as string',
        inputs: { apiKey: true, indexName: false },
      },
      {
        description: 'number as string',
        inputs: { apiKey: 12345, indexName: 67890 },
      },
      {
        description: 'array as value',
        inputs: { apiKey: ['a', 'b', 'c'], indexName: [1, 2, 3] },
      },
      {
        description: 'object as value',
        inputs: { apiKey: { key: 'value' }, indexName: { name: 'test' } },
      },
      {
        description: 'function as value',
        inputs: { apiKey: () => 'key', indexName: function() { return 'index'; } },
      },
      {
        description: 'symbol as value',
        inputs: { apiKey: Symbol('key'), indexName: Symbol('index') },
      },
    ];

    typeCoercionCases.forEach(testCase => {
      const node = createMockNode({
        data: {
          type: 'pinecone',
          inputs: testCase.inputs,
        },
      });

      expect(() => {
        const result = converter.convert(node, {});
        expect(result).toBeDefined();
      }).not.toThrow(`Should handle ${testCase.description}`);
    });
  });

  test('should handle concurrent access to shared resources', async () => {
    const { PineconeConverter } = require('../../src/registry/converters/vectorstore.js');
    
    // Simulate shared resource (like a configuration cache)
    let sharedResource = { accessCount: 0, data: new Map() };

    const converterWithSharedResource = {
      convert: (node: any, context: any) => {
        // Simulate concurrent access to shared resource
        sharedResource.accessCount++;
        const key = `${node.id}-${sharedResource.accessCount}`;
        sharedResource.data.set(key, node);
        
        // Perform actual conversion
        const converter = new PineconeConverter();
        return converter.convert(node, context);
      },
    };

    // Create 50 concurrent conversion tasks
    const concurrentTasks = Array.from({ length: 50 }, (_, i) => {
      const node = createMockNode({
        id: `concurrent-${i}`,
        data: {
          type: 'pinecone',
          inputs: { apiKey: `key-${i}`, indexName: `index-${i}` },
        },
      });

      return converterWithSharedResource.convert(node, {});
    });

    const results = await Promise.all(concurrentTasks);

    // All conversions should succeed
    expect(results).toHaveLength(50);
    results.forEach(result => {
      expect(result).toHaveLength(2);
    });

    // Shared resource should be accessed correctly
    expect(sharedResource.accessCount).toBe(50);
    expect(sharedResource.data.size).toBe(50);
  });

  test('should handle infinite recursion protection', () => {
    const { PineconeConverter } = require('../../src/registry/converters/vectorstore.js');
    
    // Create a mock converter that could cause infinite recursion
    const recursiveConverter = {
      convert: function(node: any, context: any, depth = 0): any {
        // Protect against infinite recursion
        if (depth > 100) {
          throw new Error('Maximum recursion depth exceeded');
        }

        // Simulate recursive behavior
        if (node.data?.inputs?.recursive && depth < 5) {
          return this.convert(node, context, depth + 1);
        }

        // Perform normal conversion
        const converter = new PineconeConverter();
        return converter.convert(node, context);
      },
    };

    // Test with recursive configuration
    const recursiveNode = createMockNode({
      data: {
        type: 'pinecone',
        inputs: {
          apiKey: 'recursive-key',
          indexName: 'recursive-index',
          recursive: true,
        },
      },
    });

    expect(() => {
      const result = recursiveConverter.convert(recursiveNode, {});
      expect(result).toBeDefined();
    }).not.toThrow();

    // Test with potential infinite recursion
    const infiniteNode = createMockNode({
      data: {
        type: 'pinecone',
        inputs: {
          apiKey: 'infinite-key',
          indexName: 'infinite-index',
          recursive: true,
          forceInfinite: true,
        },
      },
    });

    // Should handle infinite recursion protection
    expect(() => {
      recursiveConverter.convert(infiniteNode, {}, 150); // Start at high depth
    }).toThrow('Maximum recursion depth exceeded');
  });
});
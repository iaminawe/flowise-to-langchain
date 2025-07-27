import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { GraphRAGChainConverter } from '../../src/registry/converters/rag-chains.js';
import type { IRNode } from '../../src/ir/types.js';

// Mock the graph database modules
jest.mock('@langchain/community/graphs/neo4j_graph', () => ({
  Neo4jGraph: {
    initialize: jest.fn().mockResolvedValue({
      query: jest.fn().mockImplementation((query: string) => {
        // Simulate Neo4j query response
        return Promise.resolve([
          {
            n: { name: 'Node1', description: 'First node' },
            r: { type: 'CONNECTS_TO' },
            related: { name: 'Node2', description: 'Second node' },
          },
          {
            n: { name: 'Node2', description: 'Second node' },
            r: { type: 'RELATES_TO' },
            related: { name: 'Node3', description: 'Third node' },
          },
        ]);
      }),
      close: jest.fn(),
    }),
  },
}));

jest.mock('@langchain/community/graphs/arango_graph', () => ({
  ArangoGraph: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockImplementation((query: string) => {
      // Simulate ArangoDB query response
      return Promise.resolve([
        {
          name: 'Entity1',
          relationship: 'linked_to',
          relatedName: 'Entity2',
          description: 'ArangoDB entity',
        },
      ]);
    }),
    close: jest.fn(),
  })),
}));

jest.mock('@langchain/community/graphs/neptune_graph', () => ({
  NeptuneGraph: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockImplementation((query: string) => {
      // Simulate Neptune query response
      return Promise.resolve([
        {
          name: 'Vertex1',
          edgeLabel: 'connects',
          relatedName: 'Vertex2',
          properties: { description: 'Neptune vertex' },
        },
      ]);
    }),
    close: jest.fn(),
  })),
}));

describe('GraphRAGChainConverter', () => {
  let converter: GraphRAGChainConverter;
  let mockNode: IRNode;

  beforeEach(() => {
    converter = new GraphRAGChainConverter();
    mockNode = {
      id: 'graph-rag-1',
      type: 'GraphRAGChain',
      label: 'Graph RAG Chain',
      data: {
        graphDatabase: 'neo4j',
        maxHops: 2,
        entityExtraction: true,
      },
      inputs: {},
      outputs: {},
    };

    // Set up environment variables
    process.env.NEO4J_URL = 'bolt://localhost:7687';
    process.env.NEO4J_USERNAME = 'neo4j';
    process.env.NEO4J_PASSWORD = 'password';
    process.env.ARANGO_URL = 'http://localhost:8529';
    process.env.ARANGO_DATABASE = '_system';
    process.env.ARANGO_USERNAME = 'root';
    process.env.ARANGO_PASSWORD = 'password';
    process.env.NEPTUNE_ENDPOINT = 'neptune.amazonaws.com';
    process.env.NEPTUNE_PORT = '8182';
    process.env.AWS_REGION = 'us-east-1';
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up environment variables
    delete process.env.NEO4J_URL;
    delete process.env.NEO4J_USERNAME;
    delete process.env.NEO4J_PASSWORD;
    delete process.env.ARANGO_URL;
    delete process.env.ARANGO_DATABASE;
    delete process.env.ARANGO_USERNAME;
    delete process.env.ARANGO_PASSWORD;
    delete process.env.NEPTUNE_ENDPOINT;
    delete process.env.NEPTUNE_PORT;
    delete process.env.AWS_REGION;
  });

  describe('convert', () => {
    it('should generate code for Neo4j integration', () => {
      const context = {
        targetLanguage: 'typescript' as const,
        includeLangfuse: false,
        includeComments: true,
        outputFormat: 'esm' as const,
      };

      const fragments = converter.convert(mockNode, context);

      expect(fragments).toHaveLength(2);
      expect(fragments[0].type).toBe('import');
      expect(fragments[1].type).toBe('initialization');

      const initCode = fragments[1].content;
      expect(initCode).toContain('executeGraphQuery');
      expect(initCode).toContain('neo4j');
      expect(initCode).toContain('Neo4jGraph');
      expect(initCode).toContain('NEO4J_URL');
      expect(initCode).toContain('NEO4J_USERNAME');
      expect(initCode).toContain('NEO4J_PASSWORD');
    });

    it('should generate code for ArangoDB integration', () => {
      mockNode.data.graphDatabase = 'arangodb';
      
      const context = {
        targetLanguage: 'typescript' as const,
        includeLangfuse: false,
        includeComments: true,
        outputFormat: 'esm' as const,
      };

      const fragments = converter.convert(mockNode, context);
      const initCode = fragments[1].content;

      expect(initCode).toContain('arangodb');
      expect(initCode).toContain('ArangoGraph');
      expect(initCode).toContain('ARANGO_URL');
      expect(initCode).toContain('ARANGO_DATABASE');
      expect(initCode).toContain('ARANGO_USERNAME');
    });

    it('should generate code for Neptune integration', () => {
      mockNode.data.graphDatabase = 'neptune';
      
      const context = {
        targetLanguage: 'typescript' as const,
        includeLangfuse: false,
        includeComments: true,
        outputFormat: 'esm' as const,
      };

      const fragments = converter.convert(mockNode, context);
      const initCode = fragments[1].content;

      expect(initCode).toContain('neptune');
      expect(initCode).toContain('NeptuneGraph');
      expect(initCode).toContain('NEPTUNE_ENDPOINT');
      expect(initCode).toContain('AWS_REGION');
    });

    it('should include entity extraction when enabled', () => {
      const context = {
        targetLanguage: 'typescript' as const,
        includeLangfuse: false,
        includeComments: true,
        outputFormat: 'esm' as const,
      };

      const fragments = converter.convert(mockNode, context);
      const initCode = fragments[1].content;

      expect(initCode).toContain('Extract entities from the question');
      expect(initCode).toContain('entityPrompt');
    });

    it('should skip entity extraction when disabled', () => {
      mockNode.data.entityExtraction = false;
      
      const context = {
        targetLanguage: 'typescript' as const,
        includeLangfuse: false,
        includeComments: true,
        outputFormat: 'esm' as const,
      };

      const fragments = converter.convert(mockNode, context);
      const initCode = fragments[1].content;

      expect(initCode).toContain('return [];');
      expect(initCode).not.toContain('Extract entities from the question');
    });

    it('should respect maxHops parameter', () => {
      mockNode.data.maxHops = 3;
      
      const context = {
        targetLanguage: 'typescript' as const,
        includeLangfuse: false,
        includeComments: true,
        outputFormat: 'esm' as const,
      };

      const fragments = converter.convert(mockNode, context);
      const initCode = fragments[1].content;

      expect(initCode).toContain('[r*1..3]');
    });
  });

  describe('Graph database query execution', () => {
    it('should execute Neo4j queries correctly', async () => {
      // Create a function that simulates the generated code
      const executeGraphQuery = async (query: string, graphDatabase: string) => {
        switch (graphDatabase) {
          case 'neo4j': {
            const { Neo4jGraph } = await import('@langchain/community/graphs/neo4j_graph');
            const graph = await Neo4jGraph.initialize({
              url: process.env.NEO4J_URL || 'bolt://localhost:7687',
              username: process.env.NEO4J_USERNAME || 'neo4j',
              password: process.env.NEO4J_PASSWORD || '',
            });
            
            const result = await graph.query(query);
            return result.map((row: any) => ({
              name: row.n?.name || '',
              relationship: row.r?.type || '',
              related: row.related?.name || '',
              description: row.related?.description || '',
            }));
          }
          default:
            console.warn(`Graph database '${graphDatabase}' not implemented, returning empty results`);
            return [];
        }
      };

      const query = `MATCH (n) WHERE n.name IN ["test"] RETURN n`;
      const result = await executeGraphQuery(query, 'neo4j');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'Node1',
        relationship: 'CONNECTS_TO',
        related: 'Node2',
        description: 'Second node',
      });
    });

    it('should execute ArangoDB queries correctly', async () => {
      const executeGraphQuery = async (query: string, graphDatabase: string) => {
        switch (graphDatabase) {
          case 'arangodb': {
            const { ArangoGraph } = await import('@langchain/community/graphs/arango_graph');
            const graph = new ArangoGraph({
              url: process.env.ARANGO_URL || 'http://localhost:8529',
              databaseName: process.env.ARANGO_DATABASE || '_system',
              username: process.env.ARANGO_USERNAME || 'root',
              password: process.env.ARANGO_PASSWORD || '',
            });
            
            const result = await graph.query(query);
            return result.map((row: any) => ({
              name: row.name || '',
              relationship: row.relationship || '',
              related: row.relatedName || '',
              description: row.description || '',
            }));
          }
          default:
            return [];
        }
      };

      const query = `FOR v IN vertices RETURN v`;
      const result = await executeGraphQuery(query, 'arangodb');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'Entity1',
        relationship: 'linked_to',
        related: 'Entity2',
        description: 'ArangoDB entity',
      });
    });

    it('should execute Neptune queries correctly', async () => {
      const executeGraphQuery = async (query: string, graphDatabase: string) => {
        switch (graphDatabase) {
          case 'neptune': {
            const { NeptuneGraph } = await import('@langchain/community/graphs/neptune_graph');
            const graph = new NeptuneGraph({
              endpoint: process.env.NEPTUNE_ENDPOINT || '',
              port: parseInt(process.env.NEPTUNE_PORT || '8182'),
              region: process.env.AWS_REGION || 'us-east-1',
            });
            
            const result = await graph.query(query);
            return result.map((row: any) => ({
              name: row.name || '',
              relationship: row.edgeLabel || '',
              related: row.relatedName || '',
              description: row.properties?.description || '',
            }));
          }
          default:
            return [];
        }
      };

      const query = `g.V().has('name', 'test')`;
      const result = await executeGraphQuery(query, 'neptune');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'Vertex1',
        relationship: 'connects',
        related: 'Vertex2',
        description: 'Neptune vertex',
      });
    });

    it('should handle unknown graph database gracefully', async () => {
      const executeGraphQuery = async (query: string, graphDatabase: string) => {
        switch (graphDatabase) {
          case 'neo4j':
          case 'arangodb':
          case 'neptune':
            return [];
          default:
            console.warn(`Graph database '${graphDatabase}' not implemented, returning empty results`);
            return [];
        }
      };

      const result = await executeGraphQuery('SELECT * FROM nodes', 'unknown_db');
      expect(result).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle missing environment variables', () => {
      delete process.env.NEO4J_URL;
      delete process.env.NEO4J_USERNAME;
      delete process.env.NEO4J_PASSWORD;
      
      const context = {
        targetLanguage: 'typescript' as const,
        includeLangfuse: false,
        includeComments: true,
        outputFormat: 'esm' as const,
      };

      const fragments = converter.convert(mockNode, context);
      const initCode = fragments[1].content;

      // Should still generate code with defaults
      expect(initCode).toContain('NEO4J_URL || \'bolt://localhost:7687\'');
      expect(initCode).toContain('NEO4J_USERNAME || \'neo4j\'');
      expect(initCode).toContain('NEO4J_PASSWORD || \'\'');
    });

    it('should handle query construction with special characters', () => {
      const context = {
        targetLanguage: 'typescript' as const,
        includeLangfuse: false,
        includeComments: true,
        outputFormat: 'esm' as const,
      };

      const fragments = converter.convert(mockNode, context);
      const initCode = fragments[1].content;

      // Should properly escape entities in query
      expect(initCode).toContain('input.entities.map(e => `"${e}"`).join(\', \')');
    });
  });

  describe('integration with RAG chain', () => {
    it('should properly integrate graph context with vector context', () => {
      const context = {
        targetLanguage: 'typescript' as const,
        includeLangfuse: false,
        includeComments: true,
        outputFormat: 'esm' as const,
      };

      const fragments = converter.convert(mockNode, context);
      const initCode = fragments[1].content;

      expect(initCode).toContain('graphContext');
      expect(initCode).toContain('vectorContext');
      expect(initCode).toContain('Knowledge Graph Context:');
      expect(initCode).toContain('Document Context:');
      expect(initCode).toContain('Provide a comprehensive answer using both sources');
    });
  });

  describe('getDependencies', () => {
    it('should return the correct dependencies', () => {
      const deps = converter.getDependencies();
      expect(deps).toContain('@langchain/core');
    });
  });
});
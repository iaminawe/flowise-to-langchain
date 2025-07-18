#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Chatflow files to convert
const chatflows = [
  { name: 'TenFourOptics', file: 'chatflows/TenFourOptics Chatflow.json' },
  { name: 'RegenCore', file: 'chatflows/RegenCore Chatflow.json' },
  { name: 'Hospital Union', file: 'chatflows/Hospital Employees Union Chatflow.json' }
];

// Node type mapping
const nodeTypeMap = {
  'conversationalRetrievalQAChain': 'ConversationalRetrievalQAChain',
  'chatOpenAI': 'ChatOpenAI',
  'openAIEmbeddings': 'OpenAIEmbeddings',
  'pinecone': 'PineconeStore',
  'bufferMemory': 'BufferMemory',
  'documentStoreVS': 'MemoryVectorStore'
};

// Generate TypeScript code for a chatflow
function convertChatflow(flowData, flowName) {
  const imports = new Set();
  const code = [];
  
  // Add necessary imports based on node types
  flowData.nodes.forEach(node => {
    const nodeType = node.data.name;
    switch (nodeType) {
      case 'chatOpenAI':
        imports.add('import { ChatOpenAI } from "@langchain/openai";');
        break;
      case 'openAIEmbeddings':
        imports.add('import { OpenAIEmbeddings } from "@langchain/openai";');
        break;
      case 'pinecone':
        imports.add('import { PineconeStore } from "@langchain/pinecone";');
        imports.add('import { Pinecone } from "@pinecone-database/pinecone";');
        break;
      case 'bufferMemory':
        imports.add('import { BufferMemory } from "langchain/memory";');
        break;
      case 'conversationalRetrievalQAChain':
        imports.add('import { ConversationalRetrievalQAChain } from "langchain/chains";');
        break;
      case 'documentStoreVS':
        imports.add('import { MemoryVectorStore } from "langchain/vectorstores/memory";');
        imports.add('import { Document } from "@langchain/core/documents";');
        break;
    }
  });
  
  // Generate function header
  code.push(`async function initialize${flowName.replace(/\s+/g, '')}Chain() {`);
  
  // Process nodes in dependency order
  const nodeMap = new Map();
  flowData.nodes.forEach(node => {
    nodeMap.set(node.id, node);
  });
  
  // Helper to generate variable name
  function getVarName(nodeId) {
    return nodeId.replace(/_\d+$/, '');
  }
  
  // Generate code for each node
  flowData.nodes.forEach(node => {
    const varName = getVarName(node.id);
    const nodeType = node.data.name;
    
    switch (nodeType) {
      case 'chatOpenAI':
        code.push(`  // Initialize ChatOpenAI
  const ${varName} = new ChatOpenAI({
    modelName: "${node.data.inputs.modelName || 'gpt-4o-mini'}",
    temperature: ${node.data.inputs.temperature || 0.9},
    streaming: ${node.data.inputs.streaming !== false},
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
`);
        break;
        
      case 'openAIEmbeddings':
        code.push(`  // Initialize OpenAI Embeddings
  const ${varName} = new OpenAIEmbeddings({
    modelName: "${node.data.inputs.modelName || 'text-embedding-ada-002'}",
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
`);
        break;
        
      case 'pinecone':
        code.push(`  // Initialize Pinecone
  const pineconeClient = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
  
  const pineconeIndex = pineconeClient.Index("${node.data.inputs.pineconeIndex || 'default'}");
  
  const ${varName} = await PineconeStore.fromExistingIndex(
    ${getVarName('openAIEmbeddings_0')},
    {
      pineconeIndex,
      textKey: "text",
      namespace: "${node.data.inputs.pineconeNamespace || ''}",
    }
  );
`);
        break;
        
      case 'documentStoreVS':
        const storeId = node.data.inputs.selectedStore || node.data.inputs.storeId || 'default';
        code.push(`  // Initialize Document Store (as Memory Vector Store)
  // Note: In production, this would load documents from Flowise store ID: ${storeId}
  const ${varName} = await MemoryVectorStore.fromDocuments(
    [], // Documents would be loaded from Flowise store
    ${getVarName('openAIEmbeddings_0') || 'embeddings'}
  );
`);
        break;
        
      case 'bufferMemory':
        code.push(`  // Initialize Buffer Memory
  const ${varName} = new BufferMemory({
    memoryKey: "${node.data.inputs.memoryKey || 'chat_history'}",
    returnMessages: true,
    outputKey: "text",
  });
`);
        break;
        
      case 'conversationalRetrievalQAChain':
        const rephrasePrompt = node.data.inputs.rephrasePrompt || 'Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.\\n\\nChat History:\\n{chat_history}\\nFollow Up Input: {question}\\nStandalone Question:';
        const responsePrompt = node.data.inputs.responsePrompt || 'Use the following pieces of context to answer the question at the end.\\n{context}\\n\\nQuestion: {question}\\nHelpful Answer:';
        
        // Find connected nodes
        const modelEdge = flowData.edges.find(e => e.target === node.id && e.targetHandle?.includes('model'));
        const retrieverEdge = flowData.edges.find(e => e.target === node.id && e.targetHandle?.includes('vectorStore'));
        const memoryEdge = flowData.edges.find(e => e.target === node.id && e.targetHandle?.includes('memory'));
        
        const modelVar = modelEdge ? getVarName(modelEdge.source) : 'chatOpenAI';
        const retrieverVar = retrieverEdge ? getVarName(retrieverEdge.source) : 'vectorStore';
        const memoryVar = memoryEdge ? getVarName(memoryEdge.source) : 'bufferMemory';
        
        code.push(`  // Initialize Conversational Retrieval QA Chain
  const ${varName} = ConversationalRetrievalQAChain.fromLLM(
    ${modelVar},
    ${retrieverVar}.asRetriever({
      searchType: "similarity",
      k: ${node.data.inputs.topK || 4},
    }),
    {
      memory: ${memoryVar},
      returnSourceDocuments: ${node.data.inputs.returnSourceDocuments || false},
      questionGeneratorTemplate: \`${rephrasePrompt.replace(/`/g, '\\`')}\`,
      qaTemplate: \`${responsePrompt.replace(/`/g, '\\`')}\`,
      verbose: false,
    }
  );
`);
        break;
    }
  });
  
  // Find the main chain node (usually the last one or the one with output)
  const mainChain = flowData.nodes.find(n => 
    n.data.name === 'conversationalRetrievalQAChain' || 
    n.data.name.includes('Chain')
  );
  const mainChainVar = mainChain ? getVarName(mainChain.id) : 'chain';
  
  code.push(`  return {
    chain: ${mainChainVar},
    memory: bufferMemory,
  };
}

// Export the main function
export async function ask${flowName.replace(/\s+/g, '')}(question: string): Promise<string> {
  const { chain } = await initialize${flowName.replace(/\s+/g, '')}Chain();
  
  const response = await chain.call({
    question,
  });
  
  return response.text;
}
`);
  
  // Generate the full file content
  const fileContent = `/**
 * Generated from ${flowName} Flowise Chatflow
 * Converted using flowise-to-langchain
 */

${Array.from(imports).join('\n')}

${code.join('\n')}

// Run if executed directly
if (require.main === module) {
  ask${flowName.replace(/\s+/g, '')}("Hello, how can you help me?")
    .then(answer => console.log("Answer:", answer))
    .catch(error => console.error("Error:", error));
}
`;
  
  return fileContent;
}

// Convert all chatflows
console.log('🚀 Converting all chatflows...\n');

chatflows.forEach(({ name, file }) => {
  try {
    console.log(`📄 Converting ${name}...`);
    
    // Read the chatflow file
    const jsonContent = fs.readFileSync(file, 'utf8');
    const flowData = JSON.parse(jsonContent);
    
    // Convert to TypeScript
    const tsCode = convertChatflow(flowData, name);
    
    // Write the output file
    const outputFile = `${name.toLowerCase().replace(/\s+/g, '-')}-converted.ts`;
    fs.writeFileSync(outputFile, tsCode);
    
    console.log(`✅ Successfully converted to ${outputFile}`);
    
  } catch (error) {
    console.error(`❌ Error converting ${name}: ${error.message}`);
  }
});

console.log('\n✨ Conversion complete!');
console.log('📝 Note: The converters have been updated to support:');
console.log('   - conversationalRetrievalQAChain');
console.log('   - documentStoreVS (mapped to MemoryVectorStore)');
console.log('\n🔧 To use the official converter when the build is fixed:');
console.log('   npx flowise-to-langchain convert "<chatflow-file>"');
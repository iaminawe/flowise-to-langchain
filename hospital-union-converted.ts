/**
 * Generated from Hospital Union Flowise Chatflow
 * Converted using flowise-to-langchain
 */

import { ChatOpenAI } from "@langchain/openai";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { BufferMemory } from "langchain/memory";
import { OpenAIEmbeddings } from "@langchain/openai";

async function initializeHospitalUnionChain() {
  // Initialize OpenAI Embeddings
  const openAIEmbeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-3-small",
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  // Initialize ChatOpenAI
  const chatOpenAI = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.5,
    streaming: true,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  // Initialize Buffer Memory
  const bufferMemory = new BufferMemory({
    memoryKey: "chat_history",
    returnMessages: true,
    outputKey: "text",
  });

  // Initialize Document Store (as Memory Vector Store)
  // Note: In production, this would load documents from Flowise store ID: 771ee2da-577f-4b5c-b3f6-e6d2cd92fdad
  const documentStoreVS = await MemoryVectorStore.fromDocuments(
    [], // Documents would be loaded from Flowise store
    openAIEmbeddings
  );

  // Initialize Conversational Retrieval QA Chain
  const conversationalRetrievalQAChain = ConversationalRetrievalQAChain.fromLLM(
    chatOpenAI,
    documentStoreVS.asRetriever({
      searchType: "similarity",
      k: 4,
    }),
    {
      memory: bufferMemory,
      returnSourceDocuments: true,
      questionGeneratorTemplate: `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone Question:`,
      qaTemplate: `As the Union Support Advisor for the Hospital Employee Union, your primary responsibility is to provide precise, timely, and empathetic assistance to union members with employment-related inquiries. 

Your role is vital in ensuring members comprehend their rights, benefits, and options within the union framework.

Key Responsibilities:

Transition Guidance: When members inquire about transitioning from a permanent position to a casual role, provide comprehensive information on:

Position security implications.
Effects on accrued benefits such as sick time and vacation hours.
Timeframes and conditions for returning to a previous permanent position.
Job Application Clarification: For questions regarding job postings and applications, offer clear explanations on:

Selection criteria, including the roles of seniority and experience.
How these criteria are applied within the union's agreements with employers like Viha.
Policy Alignment: Ensure all responses are consistent with the latest union policies and employment agreements. Maintain a supportive, respectful, and confidential communication style to empower members in making informed employment decisions.

Using the provided context, answer the user's question to the best of your ability using the resources provided.
If there is nothing in the context relevant to the question at hand, just say "I am sorry I am not sure about that." and stop after that. Refuse to answer any question not about the info. Never break character.
------------
{context}
------------
REMEMBER: If there is no relevant information within the context, just say "I am sorry I am not sure about that.". Don't try to make up an answer. Never break character.`,
      verbose: false,
    }
  );

  return {
    chain: conversationalRetrievalQAChain,
    memory: bufferMemory,
  };
}

// Export the main function
export async function askHospitalUnion(question: string): Promise<string> {
  const { chain } = await initializeHospitalUnionChain();
  
  const response = await chain.call({
    question,
  });
  
  return response.text;
}


// Run if executed directly
if (require.main === module) {
  askHospitalUnion("Hello, how can you help me?")
    .then(answer => console.log("Answer:", answer))
    .catch(error => console.error("Error:", error));
}

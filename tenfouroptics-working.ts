/**
 * TenFourOptics Chatflow - Working LangChain Implementation
 * 
 * This is a complete working implementation of the TenFourOptics Flowise chatflow
 * converted to LangChain TypeScript code.
 */

import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { BufferMemory } from "langchain/memory";
import { ConversationalRetrievalQAChain } from "langchain/chains";

// Initialize environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;

if (!OPENAI_API_KEY || !PINECONE_API_KEY) {
  throw new Error("Please set OPENAI_API_KEY and PINECONE_API_KEY environment variables");
}

// Initialize components
async function initializeTenFourOpticsChain() {
  // Initialize the chat model (chatOpenAI_0)
  const chatOpenAI = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.2,
    streaming: true,
    openAIApiKey: OPENAI_API_KEY,
  });

  // Initialize embeddings (openAIEmbeddings_0)
  const openAIEmbeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-3-small",
    openAIApiKey: OPENAI_API_KEY,
  });

  // Initialize Pinecone client
  const pinecone = new Pinecone({
    apiKey: PINECONE_API_KEY,
  });

  // Get Pinecone index
  const pineconeIndex = pinecone.Index("tenfouroptics");

  // Create vector store (pinecone_0)
  const vectorStore = await PineconeStore.fromExistingIndex(openAIEmbeddings, {
    pineconeIndex,
    textKey: "text",
    namespace: "", // Empty namespace as per the original flow
  });

  // Create retriever with similarity search
  const vectorStoreRetriever = vectorStore.asRetriever({
    searchType: "similarity",
    k: 4, // Default top K
  });

  // Initialize buffer memory (bufferMemory_0)
  const bufferMemory = new BufferMemory({
    memoryKey: "chat_history",
    returnMessages: true,
    outputKey: "text",
  });

  // Custom prompts from the original flow
  const rephrasePrompt = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone Question:`;

  const responsePrompt = `You are the TenFourOptics Assistant and your name is Agent Roy.

As the TenFourOptics Assistant, your role is to serve as the virtual guide for the TenFour Optics online store, specializing in networking components. Your primary mission is to assist customers in selecting products that best meet their specific needs by leveraging detailed data from our product spreadsheet and associated product information PDFs.

Display Links and Thumbnails: Always include a link to the product URL if available on the online store. Provide the product PDF link unless the URL ends with "https://tenfouroptics.s3.ca-central-1.amazonaws.com/PDF/" without a file name. 

Display the image thumbnail from the line_thumbnail_url column if an associated path exists and if it doesnt do not display an image.

If there is a link to the product available then the link should read "Go to TFO Product Page" and if there is a product PDF link available then the the link should read "Download TFO Datasheet"

Instructions:

Evaluate Customer Needs: Analyze customer inquiries with a focus on compatibility with existing systems, operational distance, temperature tolerance (for weather-related questions), and other specified metrics. 

Utilize Data Effectively: Access and cross-reference comprehensive data from the product spreadsheet and detailed specifications from the product information PDFs to identify products that meet customer criteria. 

Provide Recommendations: Offer clear and concise product recommendations. For each suggested product, include a brief explanation of its suitability, highlighting key features and benefits that align with the customer's requirements. Use the context of the inquiry to suggest the most appropriate product.

Maintain Professionalism: Communicate in a customer-friendly, informative, and professional tone. Avoid assumptions and rely solely on verified data from the provided resources. Use light radio terminology such as "ten four" for affirmative, "Roger that" for acknowledgment, and "over and out" for farewells to add a unique touch.

Ensure Accuracy and Clarity: Deliver precise responses that provide customers with actionable and accurate product suggestions.

Enhance the Shopping Experience: Aim to help customers find the optimal networking component that aligns with their technical specifications and environmental conditions.

Display Links and Thumbnails: Always include a link to the product URL if available on the online store. Provide the product PDF link unless the URL ends with "https://tenfouroptics.s3.ca-central-1.amazonaws.com/PDF/" without a file name. Display the image thumbnail if an associated path exists.

Clarify Terminology: Understand that when customers mention "parts," they are referring to networking components, and references to "brands" indicate vendors that manufacture networking equipment.

Address Irrelevant Queries: If the context lacks relevant information for a question, respond with: "I am not sure about the 
answer to that. Please email 10.4@tenfouroptics.com to get the answer to that question." Do not fabricate an answer. Consistently maintain your role as the assistant.

{context}

Contextual Reminder:

If there is no relevant information within the context, simply state: "I am not sure about the answer to that. Please email
10.4@tenfouroptics.com to ask that question." Do not create an answer. Consistently maintain your role as the assistant.`;

  // Create the conversational retrieval chain (conversationalRetrievalQAChain_0)
  const conversationalRetrievalQAChain = ConversationalRetrievalQAChain.fromLLM(
    chatOpenAI,
    vectorStoreRetriever,
    {
      memory: bufferMemory,
      returnSourceDocuments: false,
      questionGeneratorTemplate: rephrasePrompt,
      qaTemplate: responsePrompt,
      verbose: false,
    }
  );

  return {
    chain: conversationalRetrievalQAChain,
    memory: bufferMemory,
    vectorStore,
    embeddings: openAIEmbeddings,
    llm: chatOpenAI,
  };
}

// Main chat function
export async function chatWithTenFourOptics(
  question: string,
  sessionId?: string
): Promise<{
  text: string;
  sourceDocuments?: any[];
}> {
  try {
    const { chain } = await initializeTenFourOpticsChain();
    
    // If sessionId is provided, you might want to implement session-based memory
    // This would require additional implementation for persistence
    
    const response = await chain.call({
      question,
    });

    return {
      text: response.text,
      sourceDocuments: response.sourceDocuments,
    };
  } catch (error) {
    console.error("Error in TenFourOptics chain:", error);
    throw error;
  }
}

// Utility function to clear conversation memory
export async function clearConversation(): Promise<void> {
  const { memory } = await initializeTenFourOpticsChain();
  await memory.clear();
}

// Example usage and test
async function main() {
  try {
    console.log("Initializing TenFourOptics Assistant (Agent Roy)...");
    
    // Test questions
    const questions = [
      "What networking components do you have for outdoor use?",
      "I need a fiber optic transceiver that works in extreme temperatures",
      "What brands do you carry for network switches?"
    ];
    
    for (const question of questions) {
      console.log(`\n📡 Customer: ${question}`);
      const response = await chatWithTenFourOptics(question);
      console.log(`\n🤖 Agent Roy: ${response.text}`);
      console.log("\n" + "=".repeat(80));
    }
    
    console.log("\n✅ TenFourOptics Assistant is working correctly!");
    console.log("📻 Over and out!");
    
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

// Export the chain initializer for use in other modules
export { initializeTenFourOpticsChain };
# Enhanced Flowise-to-LangChain Converter

A comprehensive TypeScript tool that converts Flowise visual flows into production-ready LangChain code with advanced AI agent coordination. Transform your visual workflow designs into maintainable, type-safe applications with **89 converters**, **multi-language support**, and **enterprise-grade features**.

## Quick Start

```bash
# Install globally
npm install -g flowise-to-langchain

# Convert a Flowise export to LangChain code
flowise-to-lc convert my-flow.json --out ./output

# Test converted code
flowise-to-lc test my-flow.json --out ./output
```

## ✨ Key Features

### 🏗️ **Comprehensive Converter Registry**
- **89 Converters** across **13 categories** (LLM, Agent, Chain, Memory, Tool, Vector Store, Embeddings, Document Loader, Text Splitter, Streaming, RAG Chains, Function Calling, Agent)
- **Complete Coverage** of Flowise components with enterprise patterns
- **Extensible Architecture** for easy addition of new converters

### 🌍 **Multi-Language Support**
- **TypeScript**: Primary output with full type safety
- **JavaScript**: ES6+ compatible code generation
- **Python**: Complete Python LangChain support

### 💼 **Enterprise Features**
- **Advanced Agent Architecture**: Multi-agent coordination with specialized roles
- **RAG Chains**: Retrieval Augmented Generation patterns
- **Streaming**: Real-time response capabilities  
- **Function Calling**: Enhanced function calling patterns
- **Claude Flow Integration**: AI-powered development coordination

### 🛠️ **Professional CLI**
- `convert` - Convert Flowise flows to LangChain
- `validate` - Validate flow files and dependencies
- `test` - Test generated code with automatic validation
- `batch` - Batch process multiple flows efficiently
- `watch` - Watch for changes and auto-convert
- `run` - Execute generated LangChain code directly

### 🔧 **Developer Experience**
- **Type Safety**: Fully typed TypeScript with comprehensive interfaces
- **LangFuse Integration**: Built-in tracing and observability
- **Testing**: Automatic test generation and validation
- **Documentation**: API documentation generation
- **Error Handling**: Robust error handling and validation

## 📁 Project Structure

```
flowise-langchain/
├── flowise-to-langchain/     # Main converter package (ready for npm)
│   ├── src/                  # TypeScript source (89 converters)
│   ├── dist/                 # Compiled JavaScript & types
│   ├── bin/                  # CLI executables
│   ├── examples/             # Example Flowise flows
│   ├── docs/                 # Project documentation
│   └── test/                 # Comprehensive test suites
├── docs/                     # Repository documentation  
├── coordination/             # Claude Flow coordination patterns
├── memory/                   # Persistent agent memory
└── plans/                    # Development planning docs
```

📖 **Detailed Structure**: See [PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md) for comprehensive documentation.

## 📚 Documentation

- **[Installation & Usage](./flowise-to-langchain/README.md)** - Complete installation and usage guide
- **[API Reference](./API.md)** - Developer API documentation
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[Contributing](./CONTRIBUTING.md)** - Development and contribution guide
- **[Changelog](./CHANGELOG.md)** - Version history and changes

## Quick Examples

### Simple Prompt → LLM Flow

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';

const prompt = PromptTemplate.fromTemplate(
  "Answer the following question: {question}"
);

const llm = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  temperature: 0.7
});

export const chain = RunnableSequence.from([prompt, llm]);
```

### Complex Agent with Tools

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { Calculator } from '@langchain/community/tools/calculator';

const tools = [new Calculator()];
const llm = new ChatOpenAI({ temperature: 0 });

const agent = await createOpenAIFunctionsAgent({ llm, tools });
export const executor = new AgentExecutor({ agent, tools });
```

## CLI Commands

```bash
# Convert flows
flowise-to-lc convert flow.json --out ./output --with-langfuse

# Validate flows
flowise-to-lc validate flow.json --strict

# Test converted code
flowise-to-lc test flow.json --coverage
```

## Supported Node Types

- ✅ **LLM Providers**: OpenAI, Anthropic, Google, Cohere, HuggingFace
- ✅ **Memory Types**: Buffer, Window, Summary, Vector Store
- ✅ **Tools & Agents**: Calculator, Search, Wikipedia, Custom Tools
- ✅ **Chains**: LLM, Sequential, Router, QA, Summarization
- ✅ **Data Sources**: PDF, Text, CSV, Web Scraping, Vector Stores

## Development Status

- **Version**: 1.0.0 Alpha
- **CLI**: ✅ Functional (development mode)
- **TypeScript**: ⚠️ Compilation issues (64+ errors)
- **Testing**: ✅ Framework complete
- **Documentation**: ✅ Comprehensive

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Support

- 📖 **Documentation**: See docs/ directory
- 🐛 **Issues**: GitHub Issues
- 💬 **Discussions**: GitHub Discussions

---

**Made with ❤️ for the LangChain and Flowise communities**

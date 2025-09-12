# Hybrid AI Provider System

## Overview

This application now uses a strategic hybrid AI provider system that intelligently routes requests between OpenAI and Anthropic (Claude) models based on task complexity and requirements.

## Architecture

### Core Service: `lib/aiProviderService.js`

The `aiProviderService` is the central hub that:
- Routes requests to the optimal AI provider/model combination
- Handles fallbacks between providers
- Provides environment variable overrides
- Standardizes response formats
- Includes error handling and retry logic

### API Routes Updated

All AI API routes have been migrated to use the hybrid system:

- `/app/api/ai/document-analysis/route.ts` - Document analysis and form analysis
- `/app/api/ai/scoring/route.ts` - Opportunity scoring
- `/app/api/ai/enhanced-scoring/route.ts` - Advanced multi-dimensional scoring
- `/app/api/ai/smart-form-completion/route.ts` - Intelligent form completion
- `/app/api/ai/categorize/route.ts` - Project and opportunity categorization

## Environment Variables

### Required Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic Configuration  
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### Optional Override Variables

You can override the default provider/model selection for specific tasks:

```bash
# Override specific task types
AI_DOCUMENT_ANALYSIS_PROVIDER=openai
AI_DOCUMENT_ANALYSIS_MODEL=gpt-4o

AI_OPPORTUNITY_SCORING_PROVIDER=anthropic
AI_OPPORTUNITY_SCORING_MODEL=claude-3-5-sonnet-20241022

AI_ENHANCED_SCORING_PROVIDER=openai
AI_ENHANCED_SCORING_MODEL=gpt-4o

AI_SMART_FORM_COMPLETION_PROVIDER=anthropic
AI_SMART_FORM_COMPLETION_MODEL=claude-3-5-sonnet-20241022

AI_CATEGORIZATION_PROVIDER=openai
AI_CATEGORIZATION_MODEL=gpt-4o-mini

# Global overrides (affects all tasks)
AI_GLOBAL_PROVIDER=openai
AI_GLOBAL_MODEL=gpt-4o-mini
```

## Strategic Model Selection

### Default Task-to-Provider Mapping

1. **Document Analysis** → Claude 3.5 Sonnet (Complex analysis, long context)
2. **Opportunity Scoring** → GPT-4o-mini (Fast, analytical)
3. **Enhanced Scoring** → Claude 3.5 Sonnet (Complex reasoning)
4. **Smart Form Completion** → Claude 3.5 Sonnet (Nuanced understanding)
5. **Categorization** → GPT-4o-mini (Quick, efficient classification)

### Rationale

- **Anthropic Claude**: Better for complex reasoning, nuanced understanding, long documents
- **OpenAI GPT**: Better for structured outputs, fast processing, classification tasks
- **Model Selection**: Balances capability with cost/speed requirements

## Key Features

### 1. Intelligent Routing
```javascript
const response = await aiProviderService.generateCompletion(
  'task-type', // Routes to optimal provider
  messages,
  options
)
```

### 2. Environment Variable Overrides
Override any task's provider/model via environment variables without code changes.

### 3. Automatic Fallbacks
If the primary provider fails, automatically falls back to the secondary provider.

### 4. Standardized Response Format
All providers return consistent response objects with metadata.

### 5. Error Handling
Comprehensive error handling with detailed logging and graceful degradation.

## Usage Examples

### Basic Task Routing
```javascript
// Automatically routes to the best provider for document analysis
const response = await aiProviderService.generateCompletion(
  'document-analysis',
  [{ role: 'user', content: 'Analyze this document...' }],
  { maxTokens: 4000 }
)
```

### With Environment Override
```bash
# Set in environment
AI_DOCUMENT_ANALYSIS_PROVIDER=openai
AI_DOCUMENT_ANALYSIS_MODEL=gpt-4o
```

### Response Format
```javascript
{
  content: "AI response content",
  provider: "anthropic",
  model: "claude-3-5-sonnet-20241022",
  usage: {
    prompt_tokens: 150,
    completion_tokens: 300,
    total_tokens: 450
  }
}
```

## Benefits

1. **Strategic Optimization**: Each task uses the most suitable AI provider
2. **Flexibility**: Easy to override providers via environment variables
3. **Reliability**: Built-in fallback mechanisms
4. **Cost Efficiency**: Balances capability with cost
5. **Future-Proof**: Easy to add new providers or models
6. **Consistency**: Unified interface across all AI interactions

## Monitoring and Debugging

The system includes comprehensive logging:
- Provider selection decisions
- Fallback triggers
- Token usage tracking
- Error conditions
- Performance metrics

Check application logs for detailed AI provider usage information.
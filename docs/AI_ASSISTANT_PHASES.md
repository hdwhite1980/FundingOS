# AI Assistant Phases

## Current (Phase 1.5)
- Project analysis endpoint active: `/api/ai/projects/analyze`
- Opportunity analysis stub writes heuristic row (no LLM extraction yet)
- Unified assistant endpoint with session persistence & cached org context
- Field-level guidance endpoint + inline button (description, goals, budget fields can adopt)
- Matching service placeholder (`scoreMatch`) not yet surfaced in UI

## Near-Term (Phase 2)
- Cohort insight aggregation (privacy-preserving)
- Improved opportunity LLM extraction prompt
- Real matching endpoint returning ranked opportunities
- Assistant tool calling (structured function dispatch)
- Conversation summarization to reduce token usage

## Data Tables Added
- `assistant_sessions`
- `assistant_conversations`
- `ai_org_context_cache`
- (From earlier schema) `project_ai_analysis`, `opportunity_ai_analysis`, `ai_matching_scores`

## Integration Points
- Project creation modal fires analysis trigger after successful create
- Clippy assistant uses cached context + persists sessions
- Field help uses `/api/ai/assistant/field-help`

## Upgrade Path
1. Populate project analyses (backfill script)
2. Enable full opportunity LLM analysis
3. Expose top matches API + UI module
4. Cohort metrics infusion into assistant responses
5. Add redaction + PII scrubbing layer

---
Document auto-generated as part of incremental AI build-out.

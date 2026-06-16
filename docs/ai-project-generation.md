# AI-Powered Project Generation

## Overview

The AI Project Generation feature allows users to automatically generate project structures, work packages, and tasks from natural language descriptions or uploaded documents using OpenAI's GPT-4.

## Architecture

### Frontend Flow
1. **AiProjectGeneratorModal** - UI component for text input and file upload
2. **useGenerateProject** - React hook managing AI generation state
3. **CreateProjectWithAiModal** - Wrapper modal with tabs for manual vs AI creation

### Backend Flow
1. **Supabase Edge Function** (`supabase/functions/generate-project-draft/index.ts`)
   - Receives text input from frontend
   - Calls OpenAI API with structured prompts
   - Validates output against Zod schemas
   - Returns validated project draft

2. **Domain Logic** (`src/lib/ai/ai-mapper.ts`)
   - Converts AI drafts to domain model operations
   - Creates projects, estimates, and tasks in sequence
   - Integrates with existing pm.* functions

### Types & Validation
- **ai.types.ts** - TypeScript interfaces for AI drafts
- **ai.schemas.ts** - Zod validation schemas

## Setup

### Prerequisites
- Supabase project with Edge Functions enabled
- OpenAI API key

### Environment Configuration

1. **Add OpenAI API Key to Supabase**
   ```bash
   supabase secrets set OPENAI_API_KEY=your_key_here
   ```

2. **Deploy Edge Function**
   ```bash
   supabase functions deploy generate-project-draft
   ```

3. **Verify Edge Function** (Optional)
   ```bash
   supabase functions serve generate-project-draft
   ```

## Usage

### For Users

1. **Open Create Project Modal**
   - Click "Create Project" button in Projects page

2. **Select AI Generator Tab**
   - Click "AI Generator" tab in modal

3. **Describe Your Project**
   - Type detailed project description in textarea, or
   - Upload `.txt`, `.md`, or `.doc` file with project specs

4. **Generate Project**
   - Click "Generate with AI" button
   - AI will create structured project with work packages and tasks

5. **Review Preview**
   - See generated project name, dates, budget
   - Review work packages and first 3 tasks per package
   - "..." indicates additional tasks

6. **Confirm Creation**
   - Click "Create Project" to save
   - Project, estimate, and all tasks are created atomically

## API Contract

### Edge Function Endpoint
```
POST /api/ai/generate-project
Content-Type: application/json

Request:
{
  "text": "string"
}

Response (Success):
{
  "success": true,
  "draft": {
    "project": {
      "name": "string",
      "description": "string (optional)",
      "customer_name": "string (optional)",
      "start_date": "YYYY-MM-DD (optional)",
      "end_date": "YYYY-MM-DD (optional)",
      "budget_amount": "number (optional)",
      "estimated_hours": "number"
    },
    "estimates": {
      "version_number": 1,
      "work_packages": [
        {
          "name": "string",
          "estimated_hours": "number",
          "tasks": [
            {
              "title": "string",
              "description": "string (optional)",
              "priority": "low | medium | high",
              "estimate_hours": "number",
              "status": "todo | backlog"
            }
          ]
        }
      ]
    }
  }
}

Response (Error):
{
  "success": false,
  "error": "string",
  "validation_errors": {
    "field": ["error message"]
  }
}
```

## File Structure

```
src/
├── lib/
│   └── ai/
│       ├── index.ts                 # Module exports
│       ├── ai.types.ts              # TypeScript interfaces
│       ├── ai.schemas.ts            # Zod validation schemas
│       └── ai-mapper.ts             # Domain logic mapper
├── features/projects/ai/
│   ├── index.ts                     # Feature exports
│   ├── useGenerateProject.ts        # React hook
│   └── AiProjectGeneratorModal.tsx  # UI component
└── features/projects/components/create/
    └── CreateProjectWithAiModal.tsx # Wrapper modal

supabase/
└── functions/generate-project-draft/
    └── index.ts                     # Edge Function implementation
```

## Validation

All generated projects must pass Zod schema validation:
- Project name: 3-255 characters required
- Work packages: minimum 1 required
- Tasks per package: minimum 1 required
- Dates: ISO format (YYYY-MM-DD) optional
- Hours: non-negative numbers
- Priority: one of ['low', 'medium', 'high']

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Text input is required" | Empty text | Provide description or upload file |
| "OpenAI API key not configured" | Missing env var | Set OPENAI_API_KEY in Supabase |
| "Invalid JSON from AI" | Model response parsing failed | Check prompt format with OpenAI |
| "Validation failed" | Generated data doesn't match schema | Review validation errors, retry |
| "Failed to create project" | Database error during creation | Check project permissions |

## Testing

### Unit Tests
```bash
npm run test
```

### Manual Testing
1. Start dev server: `npm run dev`
2. Navigate to Projects page
3. Click "Create Project" → "AI Generator"
4. Try with sample input:
   ```
   Build a mobile app for time tracking. 
   Include user auth, time entry logging with timer,
   weekly reports, and CSV export functionality.
   ```

## Performance Considerations

- **OpenAI API calls**: ~3-5 seconds per request
- **Generation limit**: 4000 tokens per request (configurable)
- **Cost**: ~$0.01-0.05 per project generation
- **Timeout**: Frontend timeout set to 60 seconds

## Future Enhancements

1. **Batch Operations**
   - Generate multiple projects from single input
   - Import templates

2. **Advanced Features**
   - File upload with parsing (PDF, Excel)
   - Project template library
   - Regenerate with refinements
   - Multi-language support

3. **Admin Controls**
   - Cost tracking per user
   - Rate limiting
   - Model selection (GPT-3.5 vs GPT-4)

4. **Integration**
   - Import from Jira/Linear
   - Export to external tools

## Security

- OpenAI API key stored as Supabase secret
- All requests require authentication
- Validation prevents injection attacks
- Generated tasks inherit project permissions
- Rate limiting recommended (not implemented yet)

## Troubleshooting

**Modal doesn't appear**: Check browser console for import errors

**Generation fails silently**: 
- Check OpenAI API key in Supabase secrets
- Verify Edge Function is deployed
- Check browser Network tab for 500 errors

**Tasks created but incomplete**:
- Check browser console for partial failures
- Verify work package data in preview matches schema
- Try with simpler project description

## References

- [Zod Documentation](https://zod.dev)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

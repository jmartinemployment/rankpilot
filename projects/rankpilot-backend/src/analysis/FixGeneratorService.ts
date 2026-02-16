import Anthropic from '@anthropic-ai/sdk';
import { getEnv } from '../config/environment.js';
import { createLogger } from '../config/logger.js';
import type { PageData } from '../crawler/types.js';
import type { SeoFix, SeoIssue } from './types.js';

const logger = createLogger('fix-generator');

export class FixGeneratorService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: getEnv().ANTHROPIC_API_KEY });
  }

  async generateFixes(page: PageData, issues: SeoIssue[]): Promise<SeoFix[]> {
    if (issues.length === 0) return [];

    const criticalAndWarning = issues.filter((i) => i.severity !== 'info');
    if (criticalAndWarning.length === 0) return [];

    try {
      const prompt = this.buildPrompt(page, criticalAndWarning);

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') return [];

      return this.parseFixes(textBlock.text);
    } catch (error: unknown) {
      logger.error('Failed to generate fixes', {
        url: page.url,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  private buildPrompt(page: PageData, issues: SeoIssue[]): string {
    const issueList = issues
      .map((issue, idx) => `${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.category}: ${issue.message}${issue.currentValue ? ` (Current: "${issue.currentValue}")` : ''}`)
      .join('\n');

    return `You are an SEO expert. Analyze the following page and generate specific, actionable fixes for each issue.

PAGE URL: ${page.url}
CURRENT TITLE: ${page.title ?? '(missing)'}
CURRENT META DESCRIPTION: ${page.metaDescription ?? '(missing)'}
CURRENT H1: ${page.h1 ?? '(missing)'}
WORD COUNT: ${page.wordCount}
IMAGES: ${page.imageCount} total, ${page.imagesWithoutAlt} missing alt text
INTERNAL LINKS: ${page.internalLinks}
EXTERNAL LINKS: ${page.externalLinks}

ISSUES FOUND:
${issueList}

For each issue, respond in this exact JSON format (array of objects):
[
  {
    "issue": "brief issue description",
    "currentState": "what it is now",
    "recommendation": "what to do",
    "aiGeneratedFix": "the exact replacement text or action",
    "priority": "high|medium|low"
  }
]

Rules:
- Title tags should be 50-60 characters, include the primary keyword and brand name
- Meta descriptions should be 150-160 characters with a call-to-action
- Write in plain English suitable for a small business owner
- Be specific — write the actual replacement text, not generic advice
- Respond ONLY with the JSON array, no other text`;
  }

  private parseFixes(text: string): SeoFix[] {
    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = /\[[\s\S]*\]/.exec(text);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]) as SeoFix[];
      return parsed.filter(
        (fix): fix is SeoFix =>
          typeof fix.issue === 'string' &&
          typeof fix.currentState === 'string' &&
          typeof fix.recommendation === 'string' &&
          typeof fix.aiGeneratedFix === 'string' &&
          ['high', 'medium', 'low'].includes(fix.priority),
      );
    } catch (error: unknown) {
      logger.warn('Failed to parse AI fixes', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}

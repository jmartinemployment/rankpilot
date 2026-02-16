import puppeteer from 'puppeteer';
import { getPrisma } from '../config/database.js';
import { createLogger } from '../config/logger.js';
import { toErrorMessage } from '../utils/errors.js';
import type { CrawlPage } from '../generated/prisma/client.js';

const logger = createLogger('report-service');

interface ReportData {
  siteName: string;
  siteUrl: string;
  crawlDate: string;
  overallScore: number;
  previousScore: number | null;
  pageCount: number;
  pages: CrawlPage[];
}

export class ReportService {
  async generateReport(crawlId: string): Promise<Buffer> {
    const prisma = getPrisma();

    const crawl = await prisma.crawl.findUnique({
      where: { id: crawlId },
      include: {
        site: true,
        pages: { orderBy: { seoScore: 'asc' } },
      },
    });

    if (!crawl) throw new Error(`Crawl ${crawlId} not found`);

    const reportData: ReportData = {
      siteName: crawl.site.name,
      siteUrl: crawl.site.url,
      crawlDate: (crawl.completedAt ?? crawl.createdAt).toISOString().split('T')[0],
      overallScore: crawl.overallScore ?? 0,
      previousScore: crawl.previousScore,
      pageCount: crawl.pageCount,
      pages: crawl.pages,
    };

    const html = this.buildHtml(reportData);
    const pdf = await this.htmlToPdf(html);

    // Save report record
    await prisma.report.create({
      data: {
        siteId: crawl.siteId,
        crawlId: crawl.id,
      },
    });

    logger.info('Report generated', { crawlId, pages: reportData.pageCount });
    return pdf;
  }

  private async htmlToPdf(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
        printBackground: true,
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private buildHtml(data: ReportData): string {
    const scoreColor = data.overallScore >= 80 ? '#22c55e' : data.overallScore >= 50 ? '#f59e0b' : '#ef4444';
    const trend = data.previousScore !== null
      ? data.overallScore > data.previousScore ? '&#9650;' : data.overallScore < data.previousScore ? '&#9660;' : '&#8212;'
      : '';

    const pageRows = data.pages.map((p) => {
      const pageScore = p.seoScore ?? 0;
      const color = pageScore >= 80 ? '#22c55e' : pageScore >= 50 ? '#f59e0b' : '#ef4444';
      const issueCount = Array.isArray(p.issues) ? p.issues.length : 0;
      const fixCount = Array.isArray(p.fixes) ? p.fixes.length : 0;

      return `<tr>
        <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this.escapeHtml(p.url)}</td>
        <td style="color:${color};font-weight:bold;text-align:center">${pageScore}</td>
        <td style="text-align:center">${p.httpStatus ?? '-'}</td>
        <td style="text-align:center">${issueCount}</td>
        <td style="text-align:center">${fixCount}</td>
      </tr>`;
    }).join('');

    const fixDetails = data.pages
      .filter((p) => Array.isArray(p.fixes) && (p.fixes as unknown[]).length > 0)
      .map((p) => {
        const fixes = p.fixes as Array<{ issue: string; currentState: string; recommendation: string; aiGeneratedFix: string; priority: string }>;
        const fixRows = fixes.map((f) => `
          <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:8px">
            <div style="font-weight:bold;color:${f.priority === 'high' ? '#ef4444' : f.priority === 'medium' ? '#f59e0b' : '#6b7280'}">[${f.priority.toUpperCase()}] ${this.escapeHtml(f.issue)}</div>
            <div style="margin-top:4px"><strong>Current:</strong> ${this.escapeHtml(f.currentState)}</div>
            <div style="margin-top:4px"><strong>Fix:</strong> <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px">${this.escapeHtml(f.aiGeneratedFix)}</code></div>
          </div>
        `).join('');

        return `<div style="margin-bottom:16px">
          <h3 style="font-size:14px;margin-bottom:8px">${this.escapeHtml(p.url)}</h3>
          ${fixRows}
        </div>`;
      }).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; margin: 0; padding: 20px; }
    h1 { font-size: 24px; }
    h2 { font-size: 18px; margin-top: 32px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    th { background: #f9fafb; font-weight: 600; }
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:32px">
    <h1>RankPilot SEO Audit Report</h1>
    <p style="color:#6b7280">${this.escapeHtml(data.siteName)} &mdash; ${this.escapeHtml(data.siteUrl)}</p>
    <p style="color:#6b7280">Generated: ${data.crawlDate}</p>
    <div style="display:inline-block;width:120px;height:120px;border-radius:50%;border:8px solid ${scoreColor};line-height:120px;font-size:36px;font-weight:bold;color:${scoreColor}">
      ${Math.round(data.overallScore)} ${trend}
    </div>
    <p style="color:#6b7280">${data.pageCount} pages crawled</p>
  </div>

  <h2>Page Scores</h2>
  <table>
    <thead><tr><th>URL</th><th>Score</th><th>Status</th><th>Issues</th><th>Fixes</th></tr></thead>
    <tbody>${pageRows}</tbody>
  </table>

  <h2>Recommended Fixes</h2>
  ${fixDetails || '<p style="color:#6b7280">No AI-generated fixes for this crawl.</p>'}

  <div style="margin-top:40px;text-align:center;color:#9ca3af;font-size:11px">
    <p>Powered by RankPilot &mdash; AI SEO Auditor by Geek At Your Spot</p>
  </div>
</body>
</html>`;
  }

  private escapeHtml(str: string): string {
    return str
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }
}

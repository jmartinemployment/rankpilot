import { Router } from 'express';
import { ReportService } from '../reports/ReportService.js';
import { sendError } from '../utils/response.js';
import { createLogger } from '../config/logger.js';
import { toErrorMessage } from '../utils/errors.js';

const router = Router();
const logger = createLogger('reports-routes');

// GET /api/crawls/:id/report — Generate and download PDF report
router.get('/api/crawls/:id/report', async (req, res) => {
  try {
    const reportService = new ReportService();
    const pdf = await reportService.generateReport(req.params.id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rankpilot-report-${req.params.id}.pdf"`);
    res.send(pdf);
  } catch (error: unknown) {
    logger.error('Failed to generate report', { error: toErrorMessage(error) });
    sendError(res, 'Failed to generate report');
  }
});

export default router;

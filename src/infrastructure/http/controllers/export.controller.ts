import { Controller, Get, Query, Request, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('export')
export class ExportController {
  @Get('csv')
  async exportCSV(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('type') type: string,
    @Res() res: Response
  ) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=export-${type}.csv`);
    return res.send('CSV data');
  }

  @Get('pdf')
  async exportPDF(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response
  ) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=report.pdf');
    return res.send('PDF data');
  }

  @Get('json')
  async exportJSON(@Request() req, @Res() res: Response) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=backup.json');
    return res.json({ data: 'User data' });
  }
}

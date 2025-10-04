import { Injectable } from '@nestjs/common';

@Injectable()
export class ReportsService {
  async generateReport(appointmentId: string): Promise<{ fileName: string }> {
    const timestamp = Date.now();
    const fileName = `report_${appointmentId}_${timestamp}.pdf`;
    return { fileName };
  }

  async getReportInfo(appointmentId: string): Promise<{ fileName: string }> {
    const fileName = `report_${appointmentId}_latest.pdf`;
    return { fileName };
  }
}



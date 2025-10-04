import { ApiProperty } from '@nestjs/swagger';

export class GenerateReportDto {
  @ApiProperty({ description: 'Appointment ID for which to generate report' })
  appointmentId: string;
}

export class ReportResponseDto {
  @ApiProperty({ description: 'Report ID (same as appointment ID)' })
  id: string;

  @ApiProperty({ description: 'Appointment ID' })
  appointmentId: string;

  @ApiProperty({ description: 'PDF file path on server' })
  pdfPath: string;

  @ApiProperty({ description: 'Report generation date' })
  generatedAt: Date;

  @ApiProperty({ description: 'Patient name' })
  patientName: string;

  @ApiProperty({ description: 'Doctor name' })
  doctorName: string;
}


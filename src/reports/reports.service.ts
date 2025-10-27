import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { marked } from 'marked';
import { MEDICATION_PRESCRIPTIONS } from './medication-prescriptions';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // Helper function to parse markdown content for PDF
  private parseMarkdownForPDF(content: string): string {
    if (!content) return '';
    
    // Convert markdown to plain text with basic formatting
    let parsed = content;
    
    // Convert headers
    parsed = parsed.replace(/^### (.*$)/gim, '$1');
    parsed = parsed.replace(/^## (.*$)/gim, '$1');
    parsed = parsed.replace(/^# (.*$)/gim, '$1');
    
    // Convert bold text
    parsed = parsed.replace(/\*\*(.*?)\*\*/g, '$1');
    
    // Convert bullet points
    parsed = parsed.replace(/^\s*[-*]\s+(.*$)/gim, '• $1');
    parsed = parsed.replace(/^\s*\d+\.\s+(.*$)/gim, '• $1');
    
    // Convert line breaks
    parsed = parsed.replace(/\n\n/g, '\n');
    
    return parsed.trim();
  }

  async generateReport(appointmentId: string): Promise<{ fileName: string; filePath: string }> {
    console.log('=== Starting Report Generation ===');
    console.log('Appointment ID:', appointmentId);
    
    // Fetch comprehensive appointment data
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            licenseNumber: true,
            specialization: true,
          }
        },
        service: true,
        medicalForm: true,
      }
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    console.log('Appointment found:', {
      id: appointment.id,
      patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
      hasMedications: !!appointment.medications,
      medicationsCount: appointment.medications ? Object.keys(appointment.medications).length : 0,
    });

    // Fetch assessments for this appointment
    const assessments = await this.prisma.appointmentAssessment.findMany({
      where: { appointmentId },
      include: {
        assessment: true
      }
    });

    console.log('Assessments found:', assessments.length);
    assessments.forEach(a => {
      console.log(`- ${a.assessment.name}: ${a.content ? 'Has content' : 'No content'}`);
    });

    const timestamp = Date.now();
    const fileName = `report_${appointmentId}_${timestamp}.pdf`;
    const reportsDir = path.join(process.cwd(), 'reports');
    
    // Ensure reports directory exists
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filePath = path.join(reportsDir, fileName);

    console.log('Generating PDF at:', filePath);

    // Generate PDF
    await this.createPDF(appointment, assessments, filePath);

    console.log('PDF generated successfully');

    // Update appointment with report path
    await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { reportPdfPath: filePath }
    });

    console.log('=== Report Generation Complete ===');

    return { fileName, filePath };
  }

  private async createPDF(appointment: any, assessments: any[], filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          margin: 50,
          size: 'A4',
          bufferPages: true
        });
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Header with logo area
        doc
          .fontSize(24)
          .fillColor('#DC2626')
          .text('OptimaleMD', 50, 50)
          .fontSize(10)
          .fillColor('#666666')
          .text('Patient Medical Report', 50, 80)
          .moveDown(2);

        // Horizontal line
        doc
          .moveTo(50, 110)
          .lineTo(550, 110)
          .stroke('#CCCCCC');

        let yPosition = 130;

        // PATIENT INFORMATION SECTION
        doc
          .fontSize(16)
          .fillColor('#DC2626')
          .text('Patient Information', 50, yPosition)
          .moveDown(0.5);
        
        yPosition += 30;

        const patientInfo = [
          { label: 'Name', value: `${appointment.patient.firstName} ${appointment.patient.lastName}` },
          { label: 'Date of Birth', value: appointment.patient.dateOfBirth ? new Date(appointment.patient.dateOfBirth).toLocaleDateString() : 'N/A' },
          { label: 'Gender', value: appointment.patient.gender || 'N/A' },
          { label: 'Email', value: appointment.patient.primaryEmail || 'N/A' },
          { label: 'Phone', value: appointment.patient.primaryPhone || 'N/A' },
        ];

        patientInfo.forEach((info, index) => {
          doc
            .fontSize(10)
            .fillColor('#333333')
            .font('Helvetica-Bold')
            .text(info.label + ':', 70, yPosition, { continued: true })
            .font('Helvetica')
            .fillColor('#666666')
            .text(' ' + info.value);
          yPosition += 20;
        });

        yPosition += 10;

        // APPOINTMENT DETAILS SECTION
        doc
          .fontSize(16)
          .fillColor('#DC2626')
          .text('Appointment Details', 50, yPosition)
          .moveDown(0.5);
        
        yPosition += 30;

        const appointmentInfo = [
          { label: 'Service', value: appointment.service?.name || 'General Consultation' },
          { label: 'Date', value: new Date(appointment.appointmentDate).toLocaleDateString() },
          { label: 'Time', value: appointment.appointmentTime || 'N/A' },
          { label: 'Status', value: appointment.status },
          { label: 'Doctor', value: `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}` },
        ];

        appointmentInfo.forEach((info) => {
          doc
            .fontSize(10)
            .fillColor('#333333')
            .font('Helvetica-Bold')
            .text(info.label + ':', 70, yPosition, { continued: true })
            .font('Helvetica')
            .fillColor('#666666')
            .text(' ' + info.value);
          yPosition += 20;
        });

        yPosition += 10;

        // Check if we need a new page
        if (yPosition > 650) {
          doc.addPage();
          yPosition = 50;
        }

        // MEDICATIONS SECTION
        console.log('Adding medications section...');
        console.log('Medications data:', JSON.stringify(appointment.medications, null, 2));
        
        if (appointment.medications && Object.keys(appointment.medications).length > 0) {
          if (yPosition > 650) {
            doc.addPage();
            yPosition = 50;
          }

          doc
            .fontSize(16)
            .fillColor('#DC2626')
            .text('Prescribed Medications', 50, yPosition)
            .moveDown(0.5);
          
          yPosition += 30;

          Object.entries(appointment.medications).forEach(([serviceName, meds]: [string, any]) => {
            console.log(`Processing medication category: ${serviceName}`, meds);
            
            doc
              .fontSize(12)
              .fillColor('#333333')
              .font('Helvetica-Bold')
              .text(serviceName, 70, yPosition);
            
            yPosition += 20;

            if (Array.isArray(meds)) {
              meds.forEach((med: string) => {
                if (yPosition > 700) {
                  doc.addPage();
                  yPosition = 50;
                }
                
                // Add medication name
                doc
                  .fontSize(11)
                  .fillColor('#333333')
                  .font('Helvetica-Bold')
                  .text('• ' + med, 90, yPosition);
                yPosition += 20;
                
                // Add detailed prescription if available
                const prescription = MEDICATION_PRESCRIPTIONS[med];
                if (prescription) {
                  const parsedPrescription = this.parseMarkdownForPDF(prescription);
                  const lines = doc.heightOfString(parsedPrescription, { width: 400 });
                  
                  if (yPosition + lines > 700) {
                    doc.addPage();
                    yPosition = 50;
                  }
                  
                  doc
                    .fontSize(9)
                    .fillColor('#666666')
                    .font('Helvetica')
                    .text(parsedPrescription, 110, yPosition, { width: 400, align: 'justify' });
                  
                  yPosition += lines + 15;
                } else {
                  yPosition += 10;
                }
              });
            }

            yPosition += 10;
          });
          
          console.log('Medications section added successfully');
        } else {
          console.log('No medications found - adding placeholder');
          
          if (yPosition > 650) {
            doc.addPage();
            yPosition = 50;
          }

          doc
            .fontSize(16)
            .fillColor('#DC2626')
            .text('Prescribed Medications', 50, yPosition)
            .moveDown(0.5);
          
          yPosition += 30;

          doc
            .fontSize(10)
            .fillColor('#999999')
            .font('Helvetica')
            .text('No medications prescribed for this appointment.', 70, yPosition);
          
          yPosition += 40;
        }

        // PATIENT ASSESSMENTS SECTION
        console.log('Adding patient assessments section...');
        const lifestyleAssessment = assessments.find(a => a.assessment.name === 'Lifestyle Guidance');
        const otherAssessments = assessments.filter(a => a.assessment.name !== 'Lifestyle Guidance');
        
        console.log(`Found ${otherAssessments.length} regular assessments`);
        console.log(`Found lifestyle assessment: ${lifestyleAssessment ? 'Yes' : 'No'}`);

        if (otherAssessments.length > 0) {
          if (yPosition > 650) {
            doc.addPage();
            yPosition = 50;
          }

          doc
            .fontSize(16)
            .fillColor('#DC2626')
            .text('Patient Assessment', 50, yPosition)
            .moveDown(0.5);
          
          yPosition += 30;

          otherAssessments.forEach((assessment) => {
            console.log(`Adding assessment: ${assessment.assessment.name}`);
            
            if (yPosition > 650) {
              doc.addPage();
              yPosition = 50;
            }

            doc
              .fontSize(12)
              .fillColor('#333333')
              .font('Helvetica-Bold')
              .text(assessment.assessment.name, 70, yPosition);
            
            yPosition += 20;

            if (assessment.content) {
              const parsedContent = this.parseMarkdownForPDF(assessment.content);
              const lines = doc.heightOfString(parsedContent, { width: 470 });
              if (yPosition + lines > 700) {
                doc.addPage();
                yPosition = 50;
              }

              doc
                .fontSize(10)
                .fillColor('#666666')
                .font('Helvetica')
                .text(parsedContent, 70, yPosition, { width: 470, align: 'justify' });
              
              yPosition += lines + 20;
            } else {
              doc
                .fontSize(10)
                .fillColor('#999999')
                .font('Helvetica-Oblique')
                .text('No content available.', 70, yPosition);
              
              yPosition += 30;
            }
          });
          
          console.log('Patient assessments added successfully');
        } else {
          console.log('No regular assessments found - adding placeholder');
          
          if (yPosition > 650) {
            doc.addPage();
            yPosition = 50;
          }

          doc
            .fontSize(16)
            .fillColor('#DC2626')
            .text('Patient Assessment', 50, yPosition)
            .moveDown(0.5);
          
          yPosition += 30;

          doc
            .fontSize(10)
            .fillColor('#999999')
            .font('Helvetica')
            .text('No assessment completed for this appointment.', 70, yPosition);
          
          yPosition += 40;
        }

        // LIFESTYLE GUIDANCE SECTION
        if (lifestyleAssessment && lifestyleAssessment.content) {
          if (yPosition > 650) {
            doc.addPage();
            yPosition = 50;
          }

          doc
            .fontSize(16)
            .fillColor('#DC2626')
            .text('Lifestyle Guidance', 50, yPosition)
            .moveDown(0.5);
          
          yPosition += 30;

          const parsedContent = this.parseMarkdownForPDF(lifestyleAssessment.content);
          const lines = doc.heightOfString(parsedContent, { width: 470 });
          if (yPosition + lines > 700) {
            doc.addPage();
            yPosition = 50;
          }

          doc
            .fontSize(10)
            .fillColor('#666666')
            .font('Helvetica')
            .text(parsedContent, 70, yPosition, { width: 470, align: 'justify' });
          
          yPosition += lines + 20;
        }

        // Footer on last page
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          
          doc
            .fontSize(8)
            .fillColor('#999999')
            .text(
              `Generated on: ${new Date().toLocaleDateString()} | Page ${i + 1} of ${pages.count}`,
              50,
              750,
              { align: 'center', width: 500 }
            );
        }

        doc.end();

        stream.on('finish', () => {
          resolve();
        });

        stream.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  async getReportInfo(appointmentId: string): Promise<{ fileName: string }> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { reportPdfPath: true }
    });

    if (!appointment?.reportPdfPath) {
      throw new NotFoundException('Report not found for this appointment');
    }

    const fileName = path.basename(appointment.reportPdfPath);
    return { fileName };
  }

  async getReportPath(appointmentId: string): Promise<string> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { reportPdfPath: true }
    });

    if (!appointment?.reportPdfPath) {
      throw new NotFoundException('Report not found for this appointment');
    }

    if (!fs.existsSync(appointment.reportPdfPath)) {
      throw new NotFoundException('Report file not found on server');
    }

    return appointment.reportPdfPath;
  }
}



import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsResponseDto {
  @ApiProperty({ description: 'Number of today\'s appointments', example: 12 })
  todaysAppointments: number;

  @ApiProperty({ description: 'Number of labs to review', example: 2 })
  labsToReview: number;

  @ApiProperty({ description: 'Number of messages awaiting reply', example: 3 })
  messagesAwaitingReply: number;

  @ApiProperty({ description: 'Number of upcoming appointments', example: 8 })
  upcomingAppointments: number;

  @ApiProperty({ description: 'Number of patients in queue', example: 5 })
  patientsInQueue: number;

  @ApiProperty({ description: 'Number of no-show appointments today', example: 1 })
  noShowToday: number;

  @ApiProperty({ description: 'Urgent tasks summary', example: '2 overdue labs, 1 no-show, 3 unread messages' })
  urgentTasksSummary: string;

  @ApiProperty({ description: 'Whether there are urgent tasks', example: true })
  hasUrgentTasks: boolean;
}

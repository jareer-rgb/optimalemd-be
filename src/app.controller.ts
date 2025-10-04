import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  health(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  }

  // Azure health probe sometimes requests a random robots*.txt
  @Get('robots933456.txt')
  robotsProbe(): string {
    return 'User-agent: *\nDisallow:';
  }
}

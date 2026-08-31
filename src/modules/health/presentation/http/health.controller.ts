import { Controller, Get } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { HealthService } from '../../application/services/health.service';

@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @AllowAnonymous()
  getHello(): string {
    return this.health.getHello();
  }
}

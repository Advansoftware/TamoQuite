import { Module } from '@nestjs/common';
import { EvolutionService } from './evolution.service';

/**
 * Isolates the low-level Evolution API client so both the per-user WhatsApp
 * module and the global pool / outbound worker can depend on it without
 * creating circular module references.
 */
@Module({
  providers: [EvolutionService],
  exports: [EvolutionService],
})
export class EvolutionModule {}

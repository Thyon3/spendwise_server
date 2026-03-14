import { Controller, Get, Post, Put, Delete, Query, Request, UseGuards, HttpCode, HttpStatus, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { BackupService } from '../../../application/services/backup.service';

@ApiTags('backup')
@Controller('backup')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('create-full')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create full backup', description: 'Create a complete backup of all user data' })
  @ApiResponse({ status: 200, description: 'Backup created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Backup creation failed' })
  async createFullBackup(@Request() req) {
    const backupPath = await this.backupService.createFullBackup(req.user.userId);
    return { message: 'Backup created successfully', backupPath };
  }

  @Post('create-incremental')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create incremental backup', description: 'Create incremental backup since last backup' })
  @ApiResponse({ status: 200, description: 'Incremental backup created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Backup creation failed' })
  @ApiQuery({ name: 'lastBackupTime', required: true, type: String, description: 'Last backup timestamp' })
  async createIncrementalBackup(@Request() req, @Query('lastBackupTime') lastBackupTime: string) {
    const backupPath = await this.backupService.createIncrementalBackup(
      req.user.userId,
      new Date(lastBackupTime)
    );
    return { message: 'Incremental backup created successfully', backupPath };
  }

  @Post('restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore from backup', description: 'Restore user data from a backup file' })
  @ApiResponse({ status: 200, description: 'Data restored successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid backup file' })
  @ApiResponse({ status: 500, description: 'Restore failed' })
  async restoreFromBackup(@Request() req, @Body() body: { backupPath: string }) {
    await this.backupService.restoreFromBackup(req.user.userId, body.backupPath);
    return { message: 'Data restored successfully' };
  }

  @Get('history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get backup history', description: 'Get list of all backup files for the user' })
  @ApiResponse({ status: 200, description: 'Backup history retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getBackupHistory(@Request() req) {
    const history = await this.backupService.getBackupHistory(req.user.userId);
    return { backups: history };
  }

  @Post('schedule-automatic')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Schedule automatic backups', description: 'Set up automatic backup schedule' })
  @ApiResponse({ status: 200, description: 'Automatic backup scheduled successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid frequency' })
  async scheduleAutomaticBackups(@Request() req, @Body() body: { frequency: 'daily' | 'weekly' | 'monthly' }) {
    await this.backupService.scheduleAutomaticBackups(req.user.userId, body.frequency);
    return { message: 'Automatic backup scheduled successfully', frequency: body.frequency };
  }

  @Delete('cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cleanup old backups', description: 'Delete backup files older than retention period' })
  @ApiResponse({ status: 200, description: 'Backup cleanup completed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'retentionDays', required: false, type: Number, description: 'Retention period in days (default: 30)' })
  async cleanupOldBackups(@Request() req, @Query('retentionDays') retentionDays?: string) {
    const days = retentionDays ? parseInt(retentionDays) : 30;
    await this.backupService.cleanupOldBackups(req.user.userId, days);
    return { message: 'Backup cleanup completed successfully', retentionDays: days };
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export user data', description: 'Export user data in specified format' })
  @ApiResponse({ status: 200, description: 'Data exported successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid export format' })
  async exportUserData(@Request() req, @Body() body: { format: 'json' | 'csv' | 'xlsx' }) {
    const exportPath = await this.backupService.exportUserData(req.user.userId, body.format);
    return { message: 'Data exported successfully', exportPath, format: body.format };
  }

  @Get('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate backup', description: 'Validate integrity of a backup file' })
  @ApiResponse({ status: 200, description: 'Backup validation completed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid backup file' })
  @ApiQuery({ name: 'backupPath', required: true, type: String, description: 'Path to backup file' })
  async validateBackup(@Request() req, @Query('backupPath') backupPath: string) {
    const isValid = await this.backupService.validateBackup(backupPath);
    return { isValid, backupPath };
  }
}

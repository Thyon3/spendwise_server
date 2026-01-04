import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { GetSettingsUseCase, UpdateSettingsUseCase } from '../../../application/use-cases/settings/settings-ops.use-case';
import { UpdateSettingsDto } from '../../../application/dtos/settings/settings.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
    constructor(
        private readonly getUseCase: GetSettingsUseCase,
        private readonly updateUseCase: UpdateSettingsUseCase,
    ) { }

    @Get()
    get(@Request() req) {
        return this.getUseCase.execute(req.user.id);
    }

    @Put()
    update(@Request() req, @Body() dto: UpdateSettingsDto) {
        return this.updateUseCase.execute(req.user.id, dto);
    }
}

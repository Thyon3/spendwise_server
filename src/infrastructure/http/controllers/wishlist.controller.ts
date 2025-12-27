import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PrismaWishlistRepository } from '../../../infrastructure/persistence/prisma/prisma-wishlist.repository';
import { CreateWishlistItemDto, UpdateWishlistItemDto } from '../../../application/dtos/wishlist.dto';

@ApiTags('wishlist')
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WishlistController {
    constructor(private readonly repo: PrismaWishlistRepository) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Add item to wishlist' })
    async create(@Request() req: any, @Body() dto: CreateWishlistItemDto) {
        return this.repo.create(req.user.userId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get wishlist items' })
    @ApiQuery({ name: 'pending', required: false, type: Boolean })
    async findAll(@Request() req: any, @Query('pending') pending?: string) {
        return this.repo.findAll(req.user.userId, pending === 'true');
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get wishlist item by ID' })
    async findOne(@Request() req: any, @Param('id') id: string) {
        return this.repo.findById(id, req.user.userId);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update wishlist item' })
    async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateWishlistItemDto) {
        return this.repo.update(id, req.user.userId, dto);
    }

    @Post(':id/mark-purchased')
    @ApiOperation({ summary: 'Mark item as purchased' })
    async markPurchased(@Request() req: any, @Param('id') id: string) {
        return this.repo.update(id, req.user.userId, { isPurchased: true });
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Remove wishlist item' })
    async delete(@Request() req: any, @Param('id') id: string) {
        return this.repo.delete(id, req.user.userId);
    }
}

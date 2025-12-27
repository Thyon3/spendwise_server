import { Module } from '@nestjs/common';
import { WishlistController } from '../controllers/wishlist.controller';
import { PrismaWishlistRepository } from '../../persistence/prisma/prisma-wishlist.repository';

@Module({
    controllers: [WishlistController],
    providers: [PrismaWishlistRepository],
})
export class WishlistModule { }

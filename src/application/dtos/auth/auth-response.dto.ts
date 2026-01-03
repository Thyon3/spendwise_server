export class UserResponseDto {
    id: string;
    email: string;
    createdAt: Date;
}

export class AuthResponseDto {
    user: UserResponseDto;
    accessToken: string;
}

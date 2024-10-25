import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class RoleGuards implements CanActivate {
    constructor (
        private reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const roles = this.reflector.get<string[]>('roles', context.getHandler())
        if (!roles) {
            return true
        }
        const req = context.switchToHttp().getRequest()
        const user = req.user

        if (!user) {
            throw new UnauthorizedException('Không tìm thấy thông tin user trong request')
        }
        return roles.includes(user.role)
    }
}

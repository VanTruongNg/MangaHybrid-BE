import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, VERIFIED_KEY } from '../decorators/auth.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());
    const requireVerified = this.reflector.get<boolean>(
      VERIFIED_KEY,
      context.getHandler(),
    );

    if (!roles && !requireVerified) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new HttpException({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Không tìm thấy thông tin user trong request',
        code: 'AUTH.USER_NOT_FOUND'
      }, HttpStatus.UNAUTHORIZED);
    }

    if (requireVerified && !user.isVerified) {
      throw new HttpException({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Tài khoản chưa được xác thực. Vui lòng xác thực email trước khi thực hiện hành động này!',
        code: 'AUTH.EMAIL_NOT_VERIFIED'
      }, HttpStatus.FORBIDDEN);
    }

    if (roles && !roles.includes(user.role)) {
      throw new HttpException({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Bạn không có quyền thực hiện hành động này!',
        code: 'AUTH.INSUFFICIENT_PERMISSIONS'
      }, HttpStatus.FORBIDDEN);
    }

    return true;
  }
}
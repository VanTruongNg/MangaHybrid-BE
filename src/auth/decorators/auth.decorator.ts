import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { RoleGuard } from "../guards/role.guard";

export const VERIFIED_KEY = 'requireVerified';
export const ROLES_KEY = 'roles';

export interface AuthOptions {
    roles?: string[]
    requireVerified?: boolean
}

export const Auth = (options?: AuthOptions) => {
    const decorators = [UseGuards(AuthGuard(), RoleGuard)]

    if (options?.roles) {
        decorators.push(SetMetadata(ROLES_KEY, options.roles));
    }

    if (options?.requireVerified) {
        decorators.push(SetMetadata(VERIFIED_KEY, true));
    }

    return applyDecorators(...decorators)
}
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { getUserIdFromSession, isValidAdminSession } from "./auth-crypto";
import type { AuthenticatedRequest } from "./authenticated-request";

export const USER_COOKIE_NAME = "resumecraft_user";
export const ADMIN_COOKIE_NAME = "resumecraft_admin";

@Injectable()
export class UserSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = getUserIdFromSession(request.cookies?.[USER_COOKIE_NAME]);
    if (!userId) throw new UnauthorizedException("Unauthorized.");
    request.userId = userId;
    return true;
  }
}

@Injectable()
export class AdminSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!isValidAdminSession(request.cookies?.[ADMIN_COOKIE_NAME])) {
      throw new UnauthorizedException("Unauthorized.");
    }
    return true;
  }
}

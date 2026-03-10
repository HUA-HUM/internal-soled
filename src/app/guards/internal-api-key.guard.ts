import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    let apiKey = request.headers['x-internal-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('Internal API key missing');
    }

    // Si viene como array tomamos el primero
    if (Array.isArray(apiKey)) {
      apiKey = apiKey[0];
    }

    const expectedApiKey = process.env.INTERNAL_API_KEY;

    if (!expectedApiKey) {
      throw new UnauthorizedException('Internal API key not configured');
    }

    if (apiKey !== expectedApiKey) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    return true;
  }
}

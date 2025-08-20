import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseApiResponse, SuccessApiResponse } from '../dto/api-response.dto';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, BaseApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<BaseApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    return next.handle().pipe(
      map((data) => {
        // If data is already formatted, return as is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Format the response
        const formattedResponse: BaseApiResponse<T> = {
          success: true,
          statusCode: response.statusCode,
          message: this.getSuccessMessage(request.method, request.url),
          data: data,
          timestamp: new Date().toISOString(),
          path: request.url,
        };

        return formattedResponse;
      }),
    );
  }

  private getSuccessMessage(method: string, url: string): string {
    const baseUrl = url.split('?')[0]; // Remove query parameters
    
    switch (method) {
      case 'GET':
        if (url.includes('/profile')) {
          return 'User profile retrieved successfully';
        }
        return 'Data retrieved successfully';
      
      case 'POST':
        if (url.includes('/auth/register')) {
          return 'User registered successfully';
        }
        if (url.includes('/auth/login')) {
          return 'User authenticated successfully';
        }
        return 'Resource created successfully';
      
      case 'PUT':
        if (url.includes('/profile')) {
          return 'User profile updated successfully';
        }
        return 'Resource updated successfully';
      
      case 'DELETE':
        return 'Resource deleted successfully';
      
      default:
        return 'Operation completed successfully';
    }
  }
}

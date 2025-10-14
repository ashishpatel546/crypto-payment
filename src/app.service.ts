import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello() {
    return { message: 'Crypto Payment Service is running!' ,
      status: 'OK'
    };
  }
}

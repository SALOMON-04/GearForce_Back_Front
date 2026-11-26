import { Global, Module } from '@nestjs/common';
import { CryptoService } from './crypto.services.js';

@Global()
@Module({
	providers: [CryptoService],
	exports: [CryptoService],
})
export class CryptoModule {}
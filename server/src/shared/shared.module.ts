import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CryptoService } from "./crypto.service";
import { EncryptionService } from "./encryption.service";
import { MaskingService } from "./masking.service";
import { S3Service } from "./s3.service";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CryptoService, EncryptionService, MaskingService, S3Service],
  exports: [CryptoService, EncryptionService, MaskingService, S3Service],
})
export class SharedModule {}

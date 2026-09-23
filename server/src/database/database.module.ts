import { Module, Global } from "@nestjs/common";
import { SharedModule } from "shared/shared.module";
import { drizzleProvider } from "./drizzle.provider";

@Global()
@Module({
  imports: [SharedModule],
  providers: [drizzleProvider],
  exports: [drizzleProvider],
})
export class DatabaseModule {}

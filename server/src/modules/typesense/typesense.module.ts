import { Global, Module } from "@nestjs/common";
import { ApolloModule } from "modules/apollo/apollo.module";
import { TypesenseProvider } from "./core/typesense.provider";
import { TypesenseService } from "./core/typesense.service";
import { TypesenseBackfillService } from "./core/typesense-backfill.service";
import {
  TypesenseSearchService,
  TypesenseMultiSearchService,
  TypesenseApolloFallbackService,
} from "./search/services";
import { TypesenseController } from "./search/typesense-search.controller";
import { TypesenseSyncQueueModule } from "./sync-queue/typesense-sync-queue.module";

@Global()
@Module({
  imports: [ApolloModule, TypesenseSyncQueueModule],
  controllers: [TypesenseController],
  providers: [
    TypesenseProvider,
    TypesenseService,
    TypesenseBackfillService,
    TypesenseMultiSearchService,
    TypesenseApolloFallbackService,
    TypesenseSearchService,
  ],
  exports: [
    TypesenseProvider,
    TypesenseService,
    TypesenseBackfillService,
    TypesenseSearchService,
  ],
})
export class TypesenseModule {}

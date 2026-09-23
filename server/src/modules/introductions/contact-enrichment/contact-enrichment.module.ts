import { Module } from "@nestjs/common";
import { ApolloModule } from "modules/apollo/apollo.module";
import { TypesenseSyncQueueModule } from "modules/typesense/sync-queue/typesense-sync-queue.module";
import { ContactEnrichmentController } from "./contact-enrichment.controller";
import {
  ContactEnrichmentService,
  ContactEnrichmentApolloService,
  ContactEnrichmentDbService,
  ContactEnrichmentTypesenseService,
  ContactEnrichmentDetailsService,
} from "./services";

@Module({
  imports: [ApolloModule, TypesenseSyncQueueModule],
  controllers: [ContactEnrichmentController],
  providers: [
    ContactEnrichmentService,
    ContactEnrichmentApolloService,
    ContactEnrichmentDbService,
    ContactEnrichmentTypesenseService,
    ContactEnrichmentDetailsService,
  ],
  exports: [ContactEnrichmentService],
})
export class ContactEnrichmentModule {}

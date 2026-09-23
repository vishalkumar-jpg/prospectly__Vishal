import { Module } from "@nestjs/common";
import { ApolloApiService } from "./apollo-api.service";
import { ApolloSearchService } from "./apollo-search.service";

@Module({
  providers: [ApolloApiService, ApolloSearchService],
  exports: [ApolloApiService, ApolloSearchService],
})
export class ApolloModule {}

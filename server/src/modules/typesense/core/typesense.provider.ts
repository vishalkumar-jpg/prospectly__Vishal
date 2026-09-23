import { Provider, Logger } from "@nestjs/common";
import Typesense from "typesense";
import { typesenseConfig } from "config/typesense.config";
import { TYPESENSE_TOKEN } from "./typesense.constants";

const logger = new Logger("TypesenseProvider");

export const TypesenseProvider: Provider = {
  provide: TYPESENSE_TOKEN,
  useFactory: () => {
    const client = new Typesense.Client({
      nodes: [
        {
          host: typesenseConfig.host,
          port: typesenseConfig.port,
          protocol: typesenseConfig.protocol,
        },
      ],
      apiKey: typesenseConfig.apiKey,
      connectionTimeoutSeconds: typesenseConfig.connectionTimeoutSeconds,
    });

    logger.log(
      `Typesense client initialized (host: ${typesenseConfig.host}:${typesenseConfig.port})`
    );

    return client;
  },
};

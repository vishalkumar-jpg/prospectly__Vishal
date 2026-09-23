import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ValidationPipe, BadRequestException } from "@nestjs/common";
import * as vite from "vite";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ConsoleLogger } from "@nestjs/common";
import helmet from "helmet";
import express from "express";
import { getOsEnv } from "config/env.config";
import { TransformInterceptor } from "interceptors/transform.interceptor.js";
import { LoggingInterceptor } from "interceptors/logging.interceptor.js";
import { AllExceptionsFilter } from "filters/all-exceptions.filter.js";
import { toUTC } from "utils/dayjs.js";
import fs from "fs";
import path from "path";
import { AppModule } from "./src/app.module.js";

const clientRoot = path.resolve(process.cwd(), "../client");
const clientDistPath = path.join(clientRoot, "dist");
const clientIndexPath = path.join(clientDistPath, "index.html");
const embedClient = getOsEnv("EMBED_CLIENT") === "true";

dotenv.config();

// Custom logger that filters out noisy startup logs
class FilteredLogger extends ConsoleLogger {
  private readonly filteredContexts = [
    "RouterExplorer",
    "RoutesResolver",
    "InstanceLoader",
  ];

  log(message: unknown, context?: string) {
    if (context && this.filteredContexts.includes(context)) {
      return; // Skip these logs
    }
    super.log(message, context);
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bodyParser: false, // Disable default body parser to use custom limits
    logger: new FilteredLogger(),
  });

  // Register raw body middleware for webhooks BEFORE JSON parser
  // This ensures the raw body is available before express.json() parses it
  app.use(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json", limit: "50mb" })
  );
  app.use(
    "/api/webhooks/resend",
    express.raw({ type: "application/json", limit: "50mb" })
  );

  // Increase body size limit for large CSV uploads (50MB)
  // Exclude webhook routes from JSON parsing to preserve raw body
  app.use((req, res, next) => {
    // Skip JSON parsing for webhook routes (path may or may not include /api prefix)
    if (
      req.path.includes("/webhooks/stripe") ||
      req.path === "/webhooks/stripe" ||
      req.path.includes("/webhooks/resend") ||
      req.path === "/webhooks/resend"
    ) {
      return next();
    }
    express.json({ limit: "50mb" })(req, res, next);
  });
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.set("trust proxy", 1);
  app.use(cookieParser());

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix("api");

  // Global validation pipeline
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      stopAtFirstError: false,
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => {
          return Object.values(error.constraints || {}).join(", ");
        });
        return new BadRequestException({
          statusCode: 400,
          message: messages,
          error: "Bad Request",
        });
      },
    })
  );

  // Global filters and interceptors
  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor()
  );

  const config = new DocumentBuilder()
    .setTitle("Prospectly API")
    .setDescription("Business Introduction Platform API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  // Health check endpoint
  app
    .getHttpAdapter()
    .get("/api/health", (req: express.Request, res: express.Response) => {
      res.json({ status: "ok", timestamp: toUTC().toISOString() });
    });

  if (getOsEnv("NODE_ENV") === "development" && embedClient) {
    const viteDevServer = await vite.createServer({
      root: clientRoot,
      configFile: path.join(clientRoot, "vite.config.ts"),
      server: { middlewareMode: true },
      appType: "spa",
    });

    // Only use Vite middleware for non-API routes
    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      viteDevServer.middlewares(req, res, next);
    });
  } else {
    app.useStaticAssets(clientDistPath);

    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next();
      }
      if (fs.existsSync(clientIndexPath)) {
        res.sendFile(clientIndexPath);
      } else {
        res.status(404).send("Application not built. Run build command first.");
      }
    });
  }

  const PORT = parseInt(getOsEnv("PORT") || "5000", 10);

  await app.listen(PORT, "0.0.0.0");

  // Graceful shutdown handling
  process.on("SIGTERM", async () => {
    await app.close();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});

import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { appConfig } from "config/app.config";
import { GlobalMarketplaceService } from "modules/global-marketplace/global-marketplace.service";
import { RecruitmentJobShareService } from "modules/recruitment/share/share.service";
import { createSpaOgMiddleware } from "services/og-meta/spa-og.middleware";
import { init } from "@sentry/node";
import { toUTC } from "utils/dayjs";
import { existsSync } from "fs";
import { join } from "path";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./filters/all-exceptions.filter";
import { LoggingInterceptor } from "./interceptors/logging.interceptor";
import { TransformInterceptor } from "./interceptors/transform.interceptor";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  // Validate required environment variables in production
  if (
    appConfig.isProduction &&
    (!appConfig.frontendUrl ||
      !appConfig.apiUrl ||
      !appConfig.corsOrigins ||
      appConfig.corsOrigins.length === 0)
  ) {
    throw new Error(
      "FRONTEND_URL, API_URL, and CORS_ORIGINS must be set in production to allow browser clients."
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: appConfig.isProduction
      ? ["error"]
      : ["error", "warn", "log", "debug", "verbose"],
    rawBody: true,
  });

  // Trust proxy to enable Express to safely handle proxy headers (X-Forwarded-For)
  // This must be set before any middleware that reads request IPs
  app.set("trust proxy", 1);

  // ----- START SENTRY CONFIGURATION -----
  if (appConfig.sentryDsn) {
    init({
      dsn: appConfig.sentryDsn,
      tracesSampleRate: 1.0,
      debug: false,
    });
  }
  // ----- END SENTRY CONFIGURATION -----

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

  app.use(
    helmet({
      contentSecurityPolicy: appConfig.isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "https://js.stripe.com"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: [
                "'self'",
                "data:",
                "https://*.cloudfront.net",
                "https://*.amazonaws.com",
              ],
              connectSrc: [
                "'self'",
                "https://api.stripe.com",
                appConfig.frontendUrl,
                appConfig.apiUrl,
              ].filter(Boolean),
              frameSrc: ["'self'", "https://js.stripe.com"],
              fontSrc: ["'self'", "data:"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // Security: Configure CORS with whitelist of allowed origins from env/config
  const allowedOrigins = appConfig.corsOrigins;

  app.enableCors({
    credentials: true,
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-CSRF-Token",
      "X-Requested-With",
    ],
  });

  app.use(cookieParser());

  app.setGlobalPrefix("api");

  // Serve static files in production BEFORE NestJS routes
  if (appConfig.isProduction) {
    // When running from server/dist/src/main.js, process.cwd() is 'server', so we need to go up one level
    const clientDistPath = join(process.cwd(), "..", "client", "dist");
    const clientIndexPath = join(clientDistPath, "index.html");

    if (existsSync(clientDistPath)) {
      logger.log(`Serving static files from: ${clientDistPath}`);

      // Use NestJS's static asset serving method
      app.useStaticAssets(clientDistPath, {
        index: false,
        prefix: "/",
      });

      // SPA fallback — inject OG meta on public share routes, default HTML elsewhere
      const shareService = app.get(RecruitmentJobShareService);
      const marketplaceService = app.get(GlobalMarketplaceService);
      const spaOgHandler = createSpaOgMiddleware({
        indexPath: clientIndexPath,
        shareService,
        marketplaceService,
      });

      app.use(
        (
          req: express.Request,
          res: express.Response,
          next: express.NextFunction
        ) => {
          if (req.path.startsWith("/api")) {
            return next();
          }
          return spaOgHandler(req, res, next);
        }
      );
    } else {
      logger.warn(`Client dist folder not found at: ${clientDistPath}`);
      logger.warn(`Current working directory: ${process.cwd()}`);
    }
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor()
  );

  // Security: Only expose Swagger docs in non-production environments
  if (!appConfig.isProduction) {
    const config = new DocumentBuilder()
      .setTitle("Prospectly API")
      .setDescription("The Prospectly API documentation")
      .setVersion("1.0")
      .addBearerAuth()
      .addCookieAuth(appConfig.cookieNames.accessToken)
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
  }

  app
    .getHttpAdapter()
    .get("/api/health", (req: express.Request, res: express.Response) => {
      res.json({ status: "ok", timestamp: toUTC().toISOString() });
    });

  const configService = app.get(ConfigService);
  // In production, Replit requires port 5000; in development, use 5001 to avoid conflicts with Vite
  const defaultPort = appConfig.isProduction ? 5000 : 5001;
  const port = configService.get<number>("PORT") || defaultPort;
  await app.listen(port, "0.0.0.0");

  process.on("SIGTERM", async () => {
    await app.close();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    await app.close();
    process.exit(0);
  });

  logger.log(`Prospectly NestJS API server running on port ${port}`);
  if (appConfig.apiUrl) {
    logger.log(`Health check: ${appConfig.apiUrl}/api/health`);
    if (!appConfig.isProduction) {
      logger.log(`API Documentation: ${appConfig.apiUrl}/api/docs`);
    }
  }
}

bootstrap();

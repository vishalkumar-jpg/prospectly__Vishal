import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { UserInviteManagementSeeder } from "./user-invite-management.seeder";
import { TrustScoreManagementSeeder } from "./trust-score-management.seeder";
import { EmailTemplateSeeder } from "./email-templates.seeder";
import { CreditRulesSeeder } from "./credit-rules.seeder";
import { BountyStagesSeeder } from "./bounty-stages.seed";
import { IndustriesSeeder } from "./industries.seeder";
import { DepartmentsSeeder } from "./departments.seeder";
import { RecruitmentBountyTiersSeeder } from "./recruitment-bounty-tiers.seeder";
import { RecruitmentStagesSeeder } from "./recruitment-stages.seeder";
import { NotificationCategoriesSeeder } from "./notification-categories.seeder";
import { SeederModule } from "./seeder.module";

async function bootstrap() {
  const logger = new Logger("SeederScript");
  const app = await NestFactory.createApplicationContext(SeederModule);

  try {
    const inviteSeeder = app.get(UserInviteManagementSeeder);
    const trustSeeder = app.get(TrustScoreManagementSeeder);
    const emailSeeder = app.get(EmailTemplateSeeder);
    const creditSeeder = app.get(CreditRulesSeeder);
    const bountyStagesSeeder = app.get(BountyStagesSeeder);
    const industriesSeeder = app.get(IndustriesSeeder);
    const departmentsSeeder = app.get(DepartmentsSeeder);

    logger.log("Starting User Invite Management seeding...");
    await inviteSeeder.seed();
    logger.log("User Invite Management seeding completed.");

    logger.log("Starting Trust Score Management seeding...");
    await trustSeeder.seedDefaultTrustScoreRules();
    logger.log("Trust Score Management seeding completed.");

    logger.log("Starting Email Template seeding...");
    await emailSeeder.seedDefaultEmailTemplates();
    logger.log("Email Template seeding completed.");

    logger.log("Starting Credit Rules seeding...");
    await creditSeeder.seedDefaultCreditRules();
    logger.log("Credit Rules seeding completed.");

    logger.log("Starting Bounty Stages seeding...");
    await bountyStagesSeeder.seed();
    logger.log("Bounty Stages seeding completed.");

    logger.log("Starting Industries seeding...");
    await industriesSeeder.seed();
    logger.log("Industries seeding completed.");

    logger.log("Starting Departments seeding...");
    await departmentsSeeder.seed();
    logger.log("Departments seeding completed.");

    const bountyTiersSeeder = app.get(RecruitmentBountyTiersSeeder);
    logger.log("Starting Recruitment Bounty Tiers seeding...");
    await bountyTiersSeeder.seed();
    logger.log("Recruitment Bounty Tiers seeding completed.");

    const recruitmentStagesSeeder = app.get(RecruitmentStagesSeeder);
    logger.log("Starting Recruitment Stages seeding...");
    await recruitmentStagesSeeder.seed();
    logger.log("Recruitment Stages seeding completed.");

    const notificationCategoriesSeeder = app.get(NotificationCategoriesSeeder);
    logger.log("Starting Notification Categories seeding...");
    await notificationCategoriesSeeder.seed();
    logger.log("Notification Categories seeding completed.");
  } catch (error) {
    logger.error("Seeding failed", error);
    process.exit(1);
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();

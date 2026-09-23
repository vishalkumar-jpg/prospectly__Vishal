import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
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
import { DatabaseModule } from "../database.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule],
  providers: [
    UserInviteManagementSeeder,
    TrustScoreManagementSeeder,
    EmailTemplateSeeder,
    CreditRulesSeeder,
    BountyStagesSeeder,
    IndustriesSeeder,
    DepartmentsSeeder,
    RecruitmentBountyTiersSeeder,
    RecruitmentStagesSeeder,
    NotificationCategoriesSeeder,
  ],
  exports: [
    UserInviteManagementSeeder,
    TrustScoreManagementSeeder,
    EmailTemplateSeeder,
    CreditRulesSeeder,
    BountyStagesSeeder,
    IndustriesSeeder,
    DepartmentsSeeder,
    RecruitmentBountyTiersSeeder,
    RecruitmentStagesSeeder,
    NotificationCategoriesSeeder,
  ],
})
export class SeederModule {}

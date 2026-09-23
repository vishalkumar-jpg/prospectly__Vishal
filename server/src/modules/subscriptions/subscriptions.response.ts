import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SubscriptionPlanPriceDto {
  @ApiProperty({ description: "Price ID" })
  id: string;

  @ApiProperty({ description: "Price amount as string" })
  price: string;

  @ApiProperty({ description: "Stripe price ID" })
  stripePriceId: string;
}

export class SubscriptionPlanDto {
  @ApiProperty({ description: "Plan ID" })
  id: string;

  @ApiProperty({ description: "Plan name" })
  name: string;

  @ApiProperty({ description: "Plan description" })
  description: string;

  @ApiPropertyOptional({
    description: "Monthly price information",
    type: SubscriptionPlanPriceDto,
    nullable: true,
  })
  monthlyPrice: SubscriptionPlanPriceDto | null;

  @ApiPropertyOptional({
    description: "Yearly price information",
    type: SubscriptionPlanPriceDto,
    nullable: true,
  })
  yearlyPrice: SubscriptionPlanPriceDto | null;

  @ApiProperty({ description: "Plan features (JSON)", type: Object })
  features: Record<string, unknown>;

  @ApiProperty({ description: "Is default plan" })
  isDefault: boolean;
}

export class SubscriptionPlansResponseDto {
  @ApiProperty({
    description: "List of subscription plans",
    type: [SubscriptionPlanDto],
  })
  plans: SubscriptionPlanDto[];
}

export class CurrentSubscriptionPlanDto {
  @ApiProperty({ description: "Plan ID" })
  id: string;

  @ApiProperty({ description: "Plan name" })
  name: string;

  @ApiProperty({ description: "Plan description" })
  description: string;

  @ApiProperty({ description: "Plan features (JSON)", type: Object })
  features: Record<string, unknown>;

  @ApiProperty({ description: "Is default plan" })
  isDefault: boolean;
}

export class CurrentSubscriptionDto {
  @ApiProperty({ description: "Subscription ID" })
  id: string;

  @ApiProperty({
    description: "Subscription plan details",
    type: CurrentSubscriptionPlanDto,
  })
  plan: CurrentSubscriptionPlanDto;

  @ApiProperty({ description: "Subscription status" })
  status: string;

  @ApiProperty({ description: "Current period start date" })
  currentPeriodStart: Date;

  @ApiProperty({ description: "Current period end date" })
  currentPeriodEnd: Date;

  @ApiProperty({ description: "Cancel at period end flag" })
  cancelAtPeriodEnd: boolean;

  @ApiProperty({ description: "Stripe subscription ID" })
  stripeSubscriptionId: string;

  @ApiPropertyOptional({ description: "Price ID" })
  priceId?: string;

  @ApiPropertyOptional({ description: "Billing interval (month/year)" })
  interval?: string;

  @ApiPropertyOptional({ description: "Price amount" })
  amount?: string;
}

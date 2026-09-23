import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Link } from "react-router-dom";

const EarningsCalculator = () => {
  const [networkSize, setNetworkSize] = useState([500]);

  const calculateWarmIntroValue = (connections: number) => {
    // Give Intros calculations
    const monthlyIntrosGiven = Math.floor(connections / 100);
    const avgCommissionPerIntro = 400;
    const monthlyEarningPotential = monthlyIntrosGiven * avgCommissionPerIntro;

    // Get Intros calculations
    const monthlyWarmIntrosReceived = Math.floor(connections / 200);
    const warmIntroSuccessRate = 85; // vs 18% for cold outreach
    const dealsPerMonth = Math.floor(monthlyWarmIntrosReceived * 0.4);

    return {
      monthlyIntrosGiven,
      avgCommissionPerIntro,
      monthlyEarningPotential,
      monthlyWarmIntrosReceived,
      warmIntroSuccessRate,
      dealsPerMonth,
    };
  };

  const warmIntroValue = calculateWarmIntroValue(networkSize[0]);

  return (
    <section className="py-5 px-0 md:px-6 bg-gradient-to-br from-emerald-50 via-purple-50 to-blue-50 dark:from-emerald-900/20 dark:via-purple-900/20 dark:to-blue-900/20">
      <div className="container mx-auto max-w-6xl px-2 md:px-0">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge
            variant="secondary"
            className="mb-4 text-sm px-3 py-1 bg-purple-100 text-purple-800 hover:bg-purple-800 hover:text-purple-100 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-300 dark:hover:text-purple-900 dark:border-purple-800"
          >
            Your Network's Introduction Power
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Turn Connections Into Warm Deals
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Warm intros close 10x faster than cold outreach with 85% meeting
            success rate
          </p>
        </div>

        {/* Value Calculator */}
        <Card className="mb-8 border-2 border-emerald-200/50 dark:border-emerald-700/50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
          <CardContent className="p-5 md:p-6">
            {/* Top Row - LinkedIn Connection Count */}
            <div className="mb-4 md:mb-6">
              <h3 className="text-lg md:text-xl font-bold mb-4 text-foreground text-center">
                What's your LinkedIn connection count?
              </h3>
              <div className="space-y-4 px-0 md:px-0">
                <Slider
                  value={networkSize}
                  onValueChange={setNetworkSize}
                  max={5000}
                  min={100}
                  step={50}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>100</span>
                  <span className="font-bold text-xl text-primary">
                    {networkSize[0].toLocaleString()}
                  </span>
                  <span>5,000+</span>
                </div>
              </div>
            </div>

            {/* Second Row - Give & Get Intros Side by Side */}
            <div className="grid md:grid-cols-2 gap-2 md:gap-6">
              {/* Get Intros - Left Side */}
              <div className="p-4 md:p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <div className="text-center mb-3">
                  <div className="inline-block bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                    Requester
                  </div>
                </div>
                <h4 className="font-bold text-blue-700 dark:text-blue-300 mb-2 text-center">
                  Get Warm Intros and Win Deals
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <div className="font-bold text-blue-600 dark:text-blue-400">
                      {warmIntroValue.monthlyWarmIntrosReceived}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Warm Intros
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-blue-600 dark:text-blue-400">
                      {warmIntroValue.warmIntroSuccessRate}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Success Rate
                    </div>
                  </div>
                  <div className="border-2 border-blue-300 dark:border-blue-600 rounded-lg p-2">
                    <div className="font-bold text-xl text-blue-700 dark:text-blue-300">
                      {warmIntroValue.dealsPerMonth}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      Deals/Month
                    </div>
                  </div>
                </div>
              </div>

              {/* Give Intros - Right Side */}
              <div className="p-4 md:p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                <div className="text-center mb-3">
                  <div className="inline-block bg-emerald-600 dark:bg-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                    Connector
                  </div>
                </div>
                <h4 className="font-bold text-emerald-700 dark:text-emerald-300 mb-2 text-center">
                  Give Intros & Earn Commissions
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                      {warmIntroValue.monthlyIntrosGiven}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Monthly Intros
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                      ${warmIntroValue.avgCommissionPerIntro}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg Commission
                    </div>
                  </div>
                  <div className="border-2 border-emerald-300 dark:border-emerald-600 rounded-lg p-2">
                    <div className="font-bold text-xl text-emerald-700 dark:text-emerald-300">
                      ${warmIntroValue.monthlyEarningPotential.toLocaleString()}
                    </div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      Monthly Earnings
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default EarningsCalculator;

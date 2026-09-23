import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  Upload,
  Users,
  DollarSign,
  Handshake,
  ArrowRight,
  Brain,
  CheckCircle,
  Shield,
} from "lucide-react";

const NetworkValueCalculator = () => {
  const [networkSize, setNetworkSize] = useState([500]);

  const bountyExamples = [
    { type: "SaaS Introduction", amount: 1200, color: "text-blue-600" },
    { type: "Enterprise Deal", amount: 1800, color: "text-emerald-600" },
    { type: "Consulting Project", amount: 800, color: "text-purple-600" },
    { type: "Real Estate Deal", amount: 2500, color: "text-orange-600" },
  ];

  const calculateNetworkValue = () => {
    const connections = networkSize[0];
    const avgConnectionValue = 50; // Average value per connection
    const monthlyOpportunities = Math.round(connections * 0.02); // 2% of network might generate opportunities monthly
    const avgBounty = 1200;
    const successRate = 0.6;

    const totalNetworkValue = connections * avgConnectionValue;
    const monthlyEarningsPotential =
      monthlyOpportunities * avgBounty * successRate;
    const yearlyEarningsPotential = monthlyEarningsPotential * 12;

    return {
      totalNetworkValue,
      monthlyEarningsPotential: Math.round(monthlyEarningsPotential),
      yearlyEarningsPotential: Math.round(yearlyEarningsPotential),
      monthlyOpportunities,
      range: {
        low: Math.round(monthlyOpportunities * 500 * successRate),
        high: Math.round(monthlyOpportunities * 2500 * successRate),
      },
    };
  };

  const {
    totalNetworkValue,
    monthlyEarningsPotential,
    yearlyEarningsPotential,
    monthlyOpportunities,
    range,
  } = calculateNetworkValue();

  return (
    <section className="py-20 bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-card/60 border border-border rounded-2xl p-6 md:p-8 shadow-card">
            <div className="grid lg:grid-cols-[1fr_1fr] gap-8 items-stretch">
              {/* LinkedIn Connections Calculator */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="text-center mb-6">
                  <h5 className="text-xl font-semibold text-foreground mb-2">
                    Your LinkedIn Connections Value
                  </h5>
                  <p className="text-muted-foreground">
                    Discover your earning potential
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-medium text-foreground">
                        Your LinkedIn Connection Count
                      </label>
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary border-primary/20"
                      >
                        {networkSize[0].toLocaleString()}
                      </Badge>
                    </div>
                    <Slider
                      value={networkSize}
                      onValueChange={setNetworkSize}
                      max={5000}
                      min={100}
                      step={100}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>100</span>
                      <span>5,000+</span>
                    </div>
                  </div>

                  <div className="feature-gradient rounded-lg p-6 border border-primary/20">
                    <div className="text-center">
                      <div className="text-4xl font-bold hero-gradient bg-clip-text text-transparent mb-2">
                        ${totalNetworkValue.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground mb-4">
                        Total Network Value
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div className="bg-card/50 rounded-lg p-3 border border-border">
                          <div className="font-semibold text-foreground">
                            {monthlyOpportunities}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Monthly Opportunities
                          </div>
                        </div>
                        <div className="bg-card/50 rounded-lg p-3 border border-border">
                          <div className="font-semibold text-foreground">
                            ${monthlyEarningsPotential.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Monthly Potential
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-primary/20">
                        <div className="text-2xl font-bold text-primary">
                          ${yearlyEarningsPotential.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Yearly Earning Potential
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-xs text-muted-foreground">
                    <Users className="w-4 h-4 inline mr-1" />
                    Based on $50 avg. value per LinkedIn connection
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    to="/browse-bounties"
                    onClick={() => window.scrollTo(0, 0)}
                  >
                    <Button className="w-full hero-gradient text-white border-0 shadow-hero hover:shadow-glow transition-smooth font-semibold">
                      See Available Bounties
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <p className="text-xs text-center text-muted-foreground mt-3">
                    No upfront costs • Secure escrow • Get paid automatically
                  </p>
                </div>
              </div>

              {/* Get Paid at Every Stage */}
              <div className="bg-gradient-to-br from-card to-card/50 border border-border rounded-xl p-6 shadow-sm">
                <div className="text-center mb-8">
                  <h4 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                    Get Paid at Every Stage
                  </h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Our multi-tier commission system ensures you get paid
                    whether the deal closes or not. Payments held in escrow and
                    released automatically.
                  </p>
                </div>

                {/* Commission Flow - More Prominent */}
                <div className="mb-8">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center group">
                      <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-xl w-20 h-20 flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-105">
                        <span className="text-3xl">🤝</span>
                      </div>
                      <h5 className="font-bold mb-2 text-foreground">
                        Introduction
                      </h5>
                      <div className="text-2xl font-bold text-blue-600 mb-2">
                        25%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Paid immediately
                      </p>
                    </div>

                    <div className="text-center group">
                      <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40 rounded-xl w-20 h-20 flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-105">
                        <span className="text-3xl">📅</span>
                      </div>
                      <h5 className="font-bold mb-2 text-foreground">
                        Meeting
                      </h5>
                      <div className="text-2xl font-bold text-green-600 mb-2">
                        50%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        When booked
                      </p>
                    </div>

                    <div className="text-center group">
                      <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 rounded-xl w-20 h-20 flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-105">
                        <span className="text-3xl">💼</span>
                      </div>
                      <h5 className="font-bold mb-2 text-foreground">
                        Deal Closed
                      </h5>
                      <div className="text-2xl font-bold text-purple-600 mb-2">
                        25%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Bonus payment
                      </p>
                    </div>
                  </div>
                </div>

                {/* Simplified Examples - Just show 2 prominent ones */}
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <h5 className="text-lg font-semibold text-foreground mb-1">
                      Real Examples
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      See how much you can earn
                    </p>
                  </div>

                  {/* Featured Example 1 */}
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h6 className="font-bold text-blue-700 dark:text-blue-300">
                          SaaS Introduction
                        </h6>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          Software sales introduction
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                          $1,200
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          Total earnings
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-white/50 dark:bg-blue-900/30 rounded p-2">
                        <div className="font-bold text-blue-700 dark:text-blue-300">
                          $300
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          Intro
                        </div>
                      </div>
                      <div className="bg-white/50 dark:bg-blue-900/30 rounded p-2">
                        <div className="font-bold text-blue-700 dark:text-blue-300">
                          $600
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          Meeting
                        </div>
                      </div>
                      <div className="bg-white/50 dark:bg-blue-900/30 rounded p-2">
                        <div className="font-bold text-blue-700 dark:text-blue-300">
                          $300
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          Bonus
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Featured Example 2 */}
                  <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h6 className="font-bold text-emerald-700 dark:text-emerald-300">
                          Enterprise Deal
                        </h6>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          Large company introduction
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                          $1,800
                        </div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          Total earnings
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-white/50 dark:bg-emerald-900/30 rounded p-2">
                        <div className="font-bold text-emerald-700 dark:text-emerald-300">
                          $450
                        </div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400">
                          Intro
                        </div>
                      </div>
                      <div className="bg-white/50 dark:bg-emerald-900/30 rounded p-2">
                        <div className="font-bold text-emerald-700 dark:text-emerald-300">
                          $900
                        </div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400">
                          Meeting
                        </div>
                      </div>
                      <div className="bg-white/50 dark:bg-emerald-900/30 rounded p-2">
                        <div className="font-bold text-emerald-700 dark:text-emerald-300">
                          $450
                        </div>
                        <div className="text-xs text-emerald-600 dark:text-emerald-400">
                          Bonus
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Compact Other Examples */}
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground text-center mb-2">
                      More examples:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-center p-2 bg-background rounded border">
                        <div className="font-semibold text-purple-600">
                          Consulting
                        </div>
                        <div className="font-bold">$800</div>
                      </div>
                      <div className="text-center p-2 bg-background rounded border">
                        <div className="font-semibold text-orange-600">
                          Real Estate
                        </div>
                        <div className="font-bold">$2,500</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NetworkValueCalculator;

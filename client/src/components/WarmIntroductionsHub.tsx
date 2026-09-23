import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Upload,
  Target,
  Handshake,
  DollarSign,
  TrendingUp,
  User,
  Users,
  Briefcase,
  Network,
  Zap,
  ArrowRight,
} from "lucide-react";

const WarmIntroductionsHub = () => {
  return (
    <section className="py-12 px-0 md:px-6 bg-background">
      <div className="container mx-auto max-w-7xl px-2 md:px-0">
        {/* Visual Header with Personas */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground px-4">
            Built on Give-to-Get Principles
          </h2>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed mb-8 px-4">
            Every member plays both roles to create a thriving network of mutual
            success.
          </p>

          {/* Integrated Personas with Process */}
          <div className="relative w-full">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-emerald-500/20 rounded-3xl blur-2xl"></div>
            <div className="relative bg-background/80 backdrop-blur-sm border border-border rounded-3xl p-2 md:p-12">
              <div className="grid lg:grid-cols-2 gap-6 lg:gap-12">
                {/* Requester - Expanded */}
                <div className="group w-full">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200/50 dark:border-blue-700/50 p-6 md:p-8 h-full">
                    {/* Persona Header */}
                    <div className="text-center mb-6 md:mb-8">
                      <div className="relative mb-4 md:mb-6">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                          <Briefcase className="w-8 h-8 md:w-10 md:h-10 text-white" />
                        </div>
                      </div>
                      <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-800 hover:text-blue-100 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-300 dark:hover:text-blue-900 dark:border-blue-800 text-base md:text-lg px-3 py-1 md:px-4 md:py-2">
                        Requester
                      </Badge>
                      <h3 className="text-xl md:text-2xl font-bold mb-3 text-foreground">
                        Need Warm Introductions?
                      </h3>
                      <p className="text-sm md:text-base text-muted-foreground mb-6">
                        Stop cold calling. Get warm introductions to your
                        prospects and close 85% more deals.
                      </p>
                    </div>

                    {/* Process Steps */}
                    <div className="space-y-4 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-5 h-5 text-purple-500" />
                        <p className="font-medium text-foreground text-sm">
                          Upload prospects & set payout
                        </p>
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        <Handshake className="w-5 h-5 text-purple-500" />
                        <p className="font-medium text-foreground text-sm">
                          Get warm introductions
                        </p>
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                        <p className="font-medium text-foreground text-sm">
                          Close deals & pay payout
                        </p>
                      </div>
                    </div>

                    {/* Target Audience */}
                    <div className="mt-6 p-3 md:p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-700">
                      <div className="flex items-start md:items-center gap-2 text-blue-700 dark:text-blue-300">
                        <Zap className="w-4 h-4 shrink-0 mt-0.5 md:mt-0" />
                        <span className="font-semibold text-xs md:text-sm text-left">
                          Perfect for sales reps, business developers, and
                          entrepreneurs
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bidirectional Arrow Divider */}
                <div className="hidden lg:block absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-6 h-6 text-purple-500 rotate-180" />
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                        <Handshake className="w-6 h-6 text-white" />
                      </div>
                      <ArrowRight className="w-6 h-6 text-purple-500" />
                    </div>
                    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-1 border border-purple-200 dark:border-purple-700">
                      <p className="text-xs font-medium text-purple-700 dark:text-purple-300 whitespace-nowrap">
                        Give to Get
                      </p>
                    </div>
                  </div>
                </div>

                {/* Connector - Expanded */}
                <div className="group w-full">
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200/50 dark:border-emerald-700/50 p-6 md:p-8 h-full">
                    {/* Persona Header */}
                    <div className="text-center mb-6 md:mb-8">
                      <div className="relative mb-4 md:mb-6">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
                          <Network className="w-8 h-8 md:w-10 md:h-10 text-white" />
                        </div>
                      </div>
                      <Badge className="mb-4 bg-emerald-100 text-emerald-800 hover:bg-emerald-800 hover:text-blue-100 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-300 dark:hover:text-emerald-900 dark:border-emerald-800 text-base md:text-lg px-3 py-1 md:px-4 md:py-2">
                        Connector
                      </Badge>
                      <h3 className="text-xl md:text-2xl font-bold mb-3 text-foreground">
                        Have a Big Network?
                      </h3>
                      <p className="text-sm md:text-base text-muted-foreground mb-6">
                        Monetize your connections. Make warm introductions and
                        earn money helping others succeed.
                      </p>
                    </div>

                    {/* Process Steps */}
                    <div className="space-y-4 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-5 h-5 text-emerald-500" />
                        <p className="font-medium text-foreground text-sm">
                          Upload your network
                        </p>
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        <Target className="w-5 h-5 text-teal-500" />
                        <p className="font-medium text-foreground text-sm">
                          Get matched to payouts
                        </p>
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        <DollarSign className="w-5 h-5 text-yellow-500" />
                        <p className="font-medium text-foreground text-sm">
                          Make intro & earn money
                        </p>
                      </div>
                    </div>

                    {/* Target Audience */}
                    <div className="mt-6 p-3 md:p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border border-emerald-200 dark:border-emerald-700">
                      <div className="flex items-start md:items-center gap-2 text-emerald-700 dark:text-emerald-300">
                        <DollarSign className="w-4 h-4 shrink-0 mt-0.5 md:mt-0" />
                        <span className="font-semibold text-xs md:text-sm text-left">
                          Perfect for networkers, consultants, and relationship
                          builders
                        </span>
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

export default WarmIntroductionsHub;

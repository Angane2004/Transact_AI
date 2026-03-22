"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Smartphone, TrendingUp, Shield, Zap } from "lucide-react";
import { authService, onboardingService } from "@/lib/localStorageService";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthFlow = () => {
      const hasSeenOnboarding = onboardingService.isComplete();
      const session = authService.getSession();
      
      if (!hasSeenOnboarding) {
        router.replace("/onboarding");
        return;
      }
      
      if (!session) {
        router.replace("/login");
        return;
      }
      
      router.replace("/dashboard");
    };

    const timeoutId = setTimeout(checkAuthFlow, 1000);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400">
              TransactAI
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              AI-Powered Personal Finance Manager
            </p>
          </div>

          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 border-t-transparent"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-blue-500" />
                  Real-time SMS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Automatic transaction categorization from SMS notifications
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Smart Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  AI-powered spending insights and trends
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-500" />
                  Secure & Private
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Your data stays on your device, encrypted and safe
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
              onClick={() => router.push("/dashboard")}
            >
              <Zap className="mr-2 h-5 w-5" />
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

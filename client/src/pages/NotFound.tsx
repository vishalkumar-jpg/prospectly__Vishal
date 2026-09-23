import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import WebsiteFooter from "@/components/WebsiteFooter";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {}, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation marketingSurface />

      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-xl text-muted-foreground mb-4">
            Oops! Page not found
          </p>
          <a href="/" className="text-primary hover:text-primary/80 underline">
            Return to Home
          </a>
        </div>
      </div>

      <WebsiteFooter />
    </div>
  );
};

export default NotFound;

import { XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PaymentFailed = () => {
  const navigate = useNavigate();

  const handleTryAgain = () => {
    navigate("/#pricing");
    // Small delay to ensure navigation completes before scrolling
    setTimeout(() => {
      document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <XCircle className="w-20 h-20 text-destructive mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-primary mb-3">Payment Unsuccessful</h1>
        <p className="text-muted-foreground mb-8">
          Something went wrong with your payment. Please try again or contact our support team for assistance.
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Home
          </Button>
          <Button onClick={handleTryAgain}>
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;

import { CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PaymentSuccess = () => (
  <div className="min-h-screen flex items-center justify-center bg-background px-4">
    <div className="text-center max-w-md">
      <CheckCircle className="w-20 h-20 text-accent mx-auto mb-6" />
      <h1 className="text-3xl font-bold text-primary mb-3">Payment Successful!</h1>
      <p className="text-muted-foreground mb-8">
        Thank you for your purchase. Your package has been activated and you'll receive a confirmation email shortly.
      </p>
      <Button asChild>
        <Link to="/">Back to Home</Link>
      </Button>
    </div>
  </div>
);

export default PaymentSuccess;

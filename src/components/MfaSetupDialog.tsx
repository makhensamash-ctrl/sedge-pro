import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

interface MfaSetupDialogProps {
  open: boolean;
  onSuccess: () => void;
}

const MfaSetupDialog = ({ open, onSuccess }: MfaSetupDialogProps) => {
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (open) {
      enrollFactor();
    }
  }, [open]);

  const enrollFactor = async () => {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Google Authenticator",
      });
      if (error) throw error;
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to set up 2FA");
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      toast.success("2FA enabled successfully!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Invalid code, please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="[&>button]:hidden max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Set Up Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Your organization requires 2FA. Scan the QR code with Google Authenticator, then enter the 6-digit code.
          </DialogDescription>
        </DialogHeader>

        {enrolling ? (
          <p className="text-center text-muted-foreground py-8">Setting up 2FA...</p>
        ) : (
          <div className="space-y-4">
            {qrCode && (
              <div className="flex flex-col items-center gap-3">
                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-lg border" />
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Can't scan? Enter manually</summary>
                  <code className="block mt-1 p-2 bg-muted rounded text-xs break-all select-all">{secret}</code>
                </details>
              </div>
            )}
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="totp-code">Verification Code</Label>
                <Input
                  id="totp-code"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  required
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || verifyCode.length !== 6}>
                {loading ? "Verifying..." : "Verify & Enable 2FA"}
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MfaSetupDialog;

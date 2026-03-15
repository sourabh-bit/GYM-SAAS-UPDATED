import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrencyINR } from "@/lib/currency";
import type { Member } from "@/hooks/useMembers";
import { Copy, Mail, MessageSquare, Phone } from "lucide-react";

interface Props {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const buildMessage = (member: Member, amount: number, link: string) => {
  const name = member.name.split(" ")[0] || member.name;
  const amountText = formatCurrencyINR(amount);
  return `Hi ${name}, your ${member.plan_name || "membership"} payment of ${amountText} is due. Pay here: ${link}`;
};

const SendPaymentLinkDialog = ({ member, open, onOpenChange }: Props) => {
  const isMobile = useIsMobile();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    if (!member) return;
    const due = member.due_amount > 0 ? member.due_amount.toString() : "";
    setAmount(due);
    setLink(null);
  }, [member]);

  const message = useMemo(() => {
    if (!member || !link) return "";
    const value = Number(amount || member.due_amount || 0);
    return buildMessage(member, value, link);
  }, [amount, link, member]);

  const handleGenerateLink = async () => {
    if (!member || loading) return;
    const payable = Number(amount || 0);
    if (!payable || payable <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("razorpay-create-payment-link", {
        body: { member_id: member.id, amount: payable },
      });
      if (error) throw error;
      if (!data?.short_url) throw new Error("Unable to generate payment link");
      setLink(data.short_url);
      toast.success("Payment link generated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate link";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied");
    } catch {
      toast.error("Unable to copy link");
    }
  };

  if (!member) return null;

  const content = (
    <div className="space-y-4">
      <div className="bg-secondary/30 rounded-xl p-3 text-center">
        <p className="text-[10px] text-muted-foreground">Current Due</p>
        <p className="font-display text-2xl font-bold text-destructive">{formatCurrencyINR(member.due_amount)}</p>
      </div>

      <div className="space-y-2">
        <Label>Amount</Label>
        <NumericInput
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="h-10 rounded-xl bg-secondary/50 border-border"
          min={1}
        />
      </div>

      <Button
        className="w-full rounded-xl"
        onClick={handleGenerateLink}
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate Payment Link"}
      </Button>

      {link && (
        <div className="rounded-xl border border-border bg-card/90 p-3 space-y-3">
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Payment Link</p>
            <p className="text-xs break-all">{link}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={handleCopy}>
              <Copy className="w-3.5 h-3.5 mr-1" /> Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank")}
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1" /> WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => window.open(`sms:${member.phone || ""}?body=${encodeURIComponent(message)}`, "_blank")}
              disabled={!member.phone}
            >
              <Phone className="w-3.5 h-3.5 mr-1" /> SMS
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => window.open(`mailto:${member.email || ""}?subject=${encodeURIComponent("Payment link")}&body=${encodeURIComponent(message)}`)}
              disabled={!member.email}
            >
              <Mail className="w-3.5 h-3.5 mr-1" /> Email
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl border-border">
          <SheetHeader>
            <SheetTitle>Send Payment Link</SheetTitle>
            <SheetDescription>Share a link for {member.name}</SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Send Payment Link</DialogTitle>
          <DialogDescription>Share a payment link with {member.name}</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default SendPaymentLinkDialog;

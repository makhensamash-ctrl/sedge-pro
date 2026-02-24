import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, UserCircle, Phone, Mail, Globe, FileText, Package, Calendar, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Lead } from "./LeadCard";

interface AdminUser {
  user_id: string;
  email: string;
  full_name: string | null;
}

interface Comment {
  id: string;
  lead_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_email?: string;
  author_name?: string;
}

interface LeadDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onAssign: (leadId: string, userId: string | null) => void;
}

const LeadDetailDialog = ({ open, onOpenChange, lead, onAssign }: LeadDetailDialogProps) => {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    fetchAdmins();
    if (lead) fetchComments(lead.id);

    // Realtime subscription for comments on this lead
    if (!lead) return;
    const channel = supabase
      .channel(`lead-comments-${lead.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "lead_comments", filter: `lead_id=eq.${lead.id}` },
        (payload) => {
          const newComment = payload.new as Comment;
          // Avoid duplicating if we already added it optimistically
          setComments((prev) => {
            if (prev.some((c) => c.id === newComment.id)) return prev;
            return [...prev, newComment];
          });
          // Enrich author info
          fetchComments(lead.id);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open, lead?.id]);

  useEffect(() => {
    // Scroll to bottom when comments change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const fetchAdmins = async () => {
    // Get all admin user_ids from user_roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id");
    if (!roles) return;

    const userIds = roles.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .in("user_id", userIds);

    setAdmins((profiles as AdminUser[]) || []);
  };

  const fetchComments = async (leadId: string) => {
    const { data } = await supabase
      .from("lead_comments")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: true });

    if (!data) return;

    // Enrich with author info
    const authorIds = [...new Set(data.map((c) => c.author_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .in("user_id", authorIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
    const enriched: Comment[] = data.map((c) => ({
      ...c,
      author_email: profileMap.get(c.author_id)?.email || "Unknown",
      author_name: profileMap.get(c.author_id)?.full_name || null,
    }));

    setComments(enriched);
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !lead || !user) return;
    setSending(true);
    try {
      const { data, error } = await supabase
        .from("lead_comments")
        .insert({ lead_id: lead.id, author_id: user.id, content: newComment.trim() })
        .select()
        .single();
      if (error) throw error;

      // Find current user profile
      const profile = admins.find((a) => a.user_id === user.id);
      setComments((prev) => [
        ...prev,
        {
          ...data,
          author_email: profile?.email || user.email || "You",
          author_name: profile?.full_name || null,
        },
      ]);
      setNewComment("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    return email.charAt(0).toUpperCase();
  };

  const getDisplayName = (name: string | null | undefined, email: string | undefined) => {
    return name || email || "Unknown";
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-lg">{lead.client_name}</DialogTitle>
        </DialogHeader>

        {/* Client Details */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 pb-3 border-b border-border text-sm">
          {lead.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
          {lead.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{lead.phone}</span>
            </div>
          )}
          {lead.source && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>{lead.source}</span>
            </div>
          )}
          {lead.generated_by && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{lead.generated_by}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="w-3.5 h-3.5 shrink-0" />
            <Badge variant={lead.package ? "default" : "outline"} className="text-xs">
              {lead.package || "Unassigned"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{format(new Date(lead.created_at), "dd MMM yyyy")}</span>
          </div>
          {lead.notes && (
            <div className="col-span-2 flex items-start gap-2 text-muted-foreground mt-1">
              <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p className="text-foreground/80 whitespace-pre-wrap break-words">{lead.notes}</p>
            </div>
          )}
        </div>

        {/* Assignment */}
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <UserCircle className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground">Assign to:</span>
          <Select
            value={lead.assigned_to || "unassigned"}
            onValueChange={(val) => onAssign(lead.id, val === "unassigned" ? null : val)}
          >
            <SelectTrigger className="h-8 w-48 text-sm">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {admins.map((admin) => (
                <SelectItem key={admin.user_id} value={admin.user_id}>
                  {admin.full_name || admin.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Comments */}
        <div className="flex-1 min-h-0 flex flex-col">
          <h4 className="text-sm font-medium mb-2">Comments</h4>
          <ScrollArea className="flex-1 max-h-[300px] pr-2" ref={scrollRef}>
            <div className="space-y-3">
              {comments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No comments yet</p>
              )}
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(comment.author_name || null, comment.author_email || "")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium truncate">
                        {getDisplayName(comment.author_name, comment.author_email)}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {format(new Date(comment.created_at), "MMM d, HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* New comment input */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-border">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="min-h-[60px] text-sm resize-none"
              maxLength={1000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendComment();
                }
              }}
            />
            <Button
              size="icon"
              className="shrink-0 self-end"
              onClick={handleSendComment}
              disabled={sending || !newComment.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailDialog;

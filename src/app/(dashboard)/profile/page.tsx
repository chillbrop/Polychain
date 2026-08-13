"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck, KeyRound, Upload, Trash2, Plus, Smartphone, Mail, Megaphone, Bell } from "lucide-react";
import { get, patch, post, del } from "@/lib/api-client";
import { toast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAuthStore } from "@/stores/auth-store";
import { formatDate, initials } from "@/lib/utils";
import type { User, Wallet } from "@/types";

const profileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "At least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

const walletSchema = z.object({
  currency: z.enum(["USDT_TRC20", "BTC", "ETH"]),
  address: z.string().min(10, "Enter a valid address"),
  label: z.string().optional(),
});

const kycSchema = z.object({
  type: z.string().min(2),
  documentUrl: z.string().min(5, "Enter the document URL"),
});

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();

  const { data: userData } = useQuery<{ user: User }>({
    queryKey: ["profile"],
    queryFn: () => get("/auth/me"),
    enabled: Boolean(user),
  });

  const profile = userData?.user || user;
  const wallets = profile?.wallets || [];

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      phone: profile?.phone || "",
      country: profile?.country || "",
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
  });

  const walletForm = useForm<z.infer<typeof walletSchema>>({
    resolver: zodResolver(walletSchema),
    defaultValues: { currency: "USDT_TRC20", address: "", label: "" },
  });

  const kycForm = useForm<z.infer<typeof kycSchema>>({
    resolver: zodResolver(kycSchema),
    defaultValues: { type: "PASSPORT", documentUrl: "" },
  });

  const [prefs, setPrefs] = useState({ email: true, push: false, marketing: true });

  const profileMutation = useMutation({
    mutationFn: (values: z.infer<typeof profileSchema>) => patch<{ user: User }>("/user/profile", values),
    onSuccess: (data) => {
      setUser(data.user);
      toast({ title: "Profile updated", description: "Your details were saved.", variant: "success" });
    },
    onError: (error) => toast({ title: "Update failed", description: (error as Error).message, variant: "destructive" }),
  });

  const passwordMutation = useMutation({
    mutationFn: (values: z.infer<typeof passwordSchema>) => post("/auth/change-password", values),
    onSuccess: () => {
      toast({ title: "Password changed", description: "You've been signed out everywhere else.", variant: "success" });
      passwordForm.reset();
    },
    onError: (error) => toast({ title: "Password change failed", description: (error as Error).message, variant: "destructive" }),
  });

  const walletMutation = useMutation({
    mutationFn: (values: z.infer<typeof walletSchema>) => post("/user/wallets", values),
    onSuccess: () => {
      toast({ title: "Wallet added", description: "Your withdrawal address was saved.", variant: "success" });
      walletForm.reset({ currency: "USDT_TRC20", address: "", label: "" });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) => toast({ title: "Failed to add wallet", description: (error as Error).message, variant: "destructive" }),
  });

  const removeWallet = useMutation({
    mutationFn: (id: string) => del(`/user/wallets/${id}`),
    onSuccess: () => {
      toast({ title: "Wallet removed", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const kycMutation = useMutation({
    mutationFn: (values: z.infer<typeof kycSchema>) => post("/user/kyc", values),
    onSuccess: () => {
      toast({ title: "KYC submitted", description: "Our team will review your documents.", variant: "success" });
      kycForm.reset({ type: "PASSPORT", documentUrl: "" });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) => toast({ title: "KYC failed", description: (error as Error).message, variant: "destructive" }),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Profile</h1>
        <p className="mt-1 text-sm text-white/50">Manage your personal information, security and wallet addresses.</p>
      </div>

      <div className="glass-card flex flex-col items-center gap-6 p-8 sm:flex-row">
        <Avatar className="h-20 w-20 border-2 border-gold/40">
          <AvatarFallback className="text-2xl">{initials(profile?.username || "U")}</AvatarFallback>
        </Avatar>
        <div className="flex-1 text-center sm:text-left">
          <h2 className="font-display text-xl font-bold">
            {(profile?.firstName || profile?.lastName) ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() : profile?.username}
          </h2>
          <p className="text-sm text-white/40">{profile?.email}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Badge variant={profile?.emailVerified ? "success" : "warning"}>
              {profile?.emailVerified ? "Email Verified" : "Email Unverified"}
            </Badge>
            <StatusBadge status={profile?.kycStatus || "NOT_SUBMITTED"} />
            <Badge variant="gold">Member since {formatDate(profile?.createdAt || new Date().toISOString())}</Badge>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-white/40">Referral code</p>
          <p className="font-mono text-lg font-bold text-gold">{profile?.referralCode}</p>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="flex-wrap">
          <TabsTrigger value="info">Personal Info</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="kyc">KYC Verification</TabsTrigger>
          <TabsTrigger value="wallets">Withdrawal Wallets</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <form className="glass-card space-y-5 p-8" onSubmit={profileForm.handleSubmit((v) => profileMutation.mutate(v))}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm text-white/60">First name</label>
                <input className="input-dark" {...profileForm.register("firstName")} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Last name</label>
                <input className="input-dark" {...profileForm.register("lastName")} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Phone</label>
                <input className="input-dark" placeholder="+1 555 000 0000" {...profileForm.register("phone")} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Country</label>
                <input className="input-dark" placeholder="United States" {...profileForm.register("country")} />
              </div>
            </div>
            <Button variant="gold" disabled={profileMutation.isPending}>
              {profileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="security" id="security">
          <div className="grid gap-6 lg:grid-cols-2">
            <form className="glass-card space-y-5 p-8" onSubmit={passwordForm.handleSubmit((v) => passwordMutation.mutate(v))}>
              <h3 className="flex items-center gap-2 font-display font-semibold"><KeyRound className="h-5 w-5 text-gold" /> Change Password</h3>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Current password</label>
                <input className="input-dark" type="password" {...passwordForm.register("currentPassword")} />
                {passwordForm.formState.errors.currentPassword && <p className="mt-1 text-xs text-red-400">{passwordForm.formState.errors.currentPassword.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">New password</label>
                <input className="input-dark" type="password" {...passwordForm.register("newPassword")} />
                {passwordForm.formState.errors.newPassword && <p className="mt-1 text-xs text-red-400">{passwordForm.formState.errors.newPassword.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Confirm new password</label>
                <input className="input-dark" type="password" {...passwordForm.register("confirmPassword")} />
                {passwordForm.formState.errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{passwordForm.formState.errors.confirmPassword.message}</p>}
              </div>
              <Button variant="gold" disabled={passwordMutation.isPending}>
                {passwordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </form>

            <div className="glass-card p-8">
              <h3 className="flex items-center gap-2 font-display font-semibold"><ShieldCheck className="h-5 w-5 text-gold" /> Two-Factor Authentication</h3>
              <p className="mt-2 text-sm text-white/50">Add an extra layer of security to your account with an authenticator app.</p>
              <div className="mt-6 flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
                <div>
                  <p className="font-medium">Authenticator app (2FA)</p>
                  <p className="text-xs text-white/40">{profile?.twoFactor ? "Currently enabled" : "Not enabled"}</p>
                </div>
                <Switch checked={profile?.twoFactor || false} disabled aria-label="Two-factor authentication" />
              </div>
              <p className="mt-4 text-xs text-white/30">
                2FA setup via authenticator app is available soon. In the meantime your account is protected with encrypted sessions and login monitoring.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="kyc">
          <div className="grid gap-6 lg:grid-cols-2">
            <form className="glass-card space-y-5 p-8" onSubmit={kycForm.handleSubmit((v) => kycMutation.mutate(v))}>
              <h3 className="flex items-center gap-2 font-display font-semibold"><Upload className="h-5 w-5 text-gold" /> Submit Documents</h3>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Document type</label>
                <Select value={kycForm.watch("type")} onValueChange={(v) => kycForm.setValue("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PASSPORT">Passport</SelectItem>
                    <SelectItem value="DRIVERS_LICENSE">Driver's License</SelectItem>
                    <SelectItem value="NATIONAL_ID">National ID</SelectItem>
                    <SelectItem value="UTILITY_BILL">Utility Bill</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Document URL</label>
                <input className="input-dark" placeholder="https://... / upload URL" {...kycForm.register("documentUrl")} />
                {kycForm.formState.errors.documentUrl && <p className="mt-1 text-xs text-red-400">{kycForm.formState.errors.documentUrl.message}</p>}
              </div>
              <Button variant="gold" disabled={kycMutation.isPending}>
                {kycMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit for Review
              </Button>
            </form>

            <div className="glass-card p-8">
              <h3 className="font-display font-semibold">Verification status</h3>
              <div className="mt-5 flex items-center gap-4">
                <StatusBadge status={profile?.kycStatus || "NOT_SUBMITTED"} />
                <p className="text-sm text-white/50">
                  {profile?.kycStatus === "APPROVED" && "Your identity is verified. You can access all plans and larger withdrawals."}
                  {profile?.kycStatus === "PENDING" && "Your documents are being reviewed. This usually takes under 24 hours."}
                  {profile?.kycStatus === "REJECTED" && "Your submission was rejected. Please re-upload clear documents."}
                  {(!profile?.kycStatus || profile?.kycStatus === "NOT_SUBMITTED") && "Complete verification to unlock higher investment tiers."}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="wallets">
          <div className="grid gap-6 lg:grid-cols-2">
            <form className="glass-card space-y-5 p-8" onSubmit={walletForm.handleSubmit((v) => walletMutation.mutate(v))}>
              <h3 className="flex items-center gap-2 font-display font-semibold"><Plus className="h-5 w-5 text-gold" /> Add Withdrawal Wallet</h3>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Currency</label>
                <Select value={walletForm.watch("currency")} onValueChange={(v) => walletForm.setValue("currency", v as "USDT_TRC20" | "BTC" | "ETH")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDT_TRC20">USDT (TRC-20)</SelectItem>
                    <SelectItem value="BTC">Bitcoin</SelectItem>
                    <SelectItem value="ETH">Ethereum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Address</label>
                <input className="input-dark font-mono" placeholder="Wallet address" {...walletForm.register("address")} />
                {walletForm.formState.errors.address && <p className="mt-1 text-xs text-red-400">{walletForm.formState.errors.address.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">Label (optional)</label>
                <input className="input-dark" placeholder="e.g. Main wallet" {...walletForm.register("label")} />
              </div>
              <Button variant="gold" disabled={walletMutation.isPending}>
                {walletMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Wallet
              </Button>
            </form>

            <div className="glass-card p-8">
              <h3 className="font-display font-semibold">Saved wallets ({wallets.length})</h3>
              <div className="mt-5 space-y-4">
                {wallets.length === 0 && <p className="py-8 text-center text-sm text-white/40">No wallets saved yet.</p>}
                {wallets.map((w: Wallet) => (
                  <div key={w.id} className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{w.currency.replace("_", " ")} {w.label ? `· ${w.label}` : ""}</p>
                      <p className="mt-0.5 break-all font-mono text-xs text-white/40">{w.address}</p>
                    </div>
                    <button onClick={() => removeWallet.mutate(w.id)} className="text-white/40 transition-colors hover:text-red-400" aria-label={`Remove ${w.currency} wallet`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="glass-card max-w-xl space-y-6 p-8">
            <h3 className="flex items-center gap-2 font-display font-semibold"><Bell className="h-5 w-5 text-gold" /> Notification Preferences</h3>
            {[
              { icon: Mail, key: "email" as const, title: "Email notifications", desc: "Deposit confirmations, payouts and security alerts." },
              { icon: Smartphone, key: "push" as const, title: "Push notifications", desc: "Real-time updates on your mobile device." },
              { icon: Megaphone, key: "marketing" as const, title: "Marketing & product updates", desc: "New plans, features and exclusive offers." },
            ].map(({ icon: Icon, key, title, desc }) => (
              <div key={key} className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-5 w-5 text-gold" />
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="text-xs text-white/40">{desc}</p>
                  </div>
                </div>
                <Switch checked={prefs[key]} onCheckedChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))} aria-label={title} />
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

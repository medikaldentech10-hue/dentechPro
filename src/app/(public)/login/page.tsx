import { LoginForm } from "@/components/auth/login-form";
import { GlassCard } from "@/components/premium/glass-card";
import { CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[1200px] items-center px-4 py-10 md:px-6">
      <GlassCard className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle>Giriş Yap</CardTitle>
        </CardHeader>
        <LoginForm />
      </GlassCard>
    </div>
  );
}

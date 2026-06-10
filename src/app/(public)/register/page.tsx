import { RegisterForm } from "@/components/auth/register-form";
import { GlassCard } from "@/components/premium/glass-card";
import { CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[1200px] items-center px-4 py-10 md:px-6">
      <GlassCard className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Kayıt Talebi Oluştur</CardTitle>
        </CardHeader>
        <RegisterForm />
      </GlassCard>
    </div>
  );
}

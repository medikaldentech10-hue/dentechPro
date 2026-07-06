import type { ReactNode } from "react";
import { Suspense } from "react";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { Footer } from "@/components/shared/footer";
import { Header } from "@/components/shared/header";
import { getCurrentProfile } from "@/lib/auth";

export default function PublicLayout({ children }: { children: ReactNode }) {
  const profilePromise = getCurrentProfile();

  return (
    <div className="min-h-dvh">
      <Suspense fallback={<Header />}>
        <PublicHeader profilePromise={profilePromise} />
      </Suspense>
      <main>{children}</main>
      <Footer />
      <SpeedInsights />
    </div>
  );
}

async function PublicHeader({
  profilePromise,
}: {
  profilePromise: ReturnType<typeof getCurrentProfile>;
}) {
  const profile = await profilePromise;

  return <Header profile={profile} />;
}

import { Suspense } from "react";
import { VerifyPendingContent } from "@/components/auth/VerifyPendingContent";

export default function VerifyPendingPage() {
  return (
    <Suspense fallback={null}>
      <VerifyPendingContent />
    </Suspense>
  );
}

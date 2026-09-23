import { Suspense } from "react";
import BookingWizard from "./BookingWizard";

export default function ReservarPage() {
  return (
    <Suspense>
      <BookingWizard />
    </Suspense>
  );
}

import { notFound } from "next/navigation";
import { StaffScreenReview } from "@/components/staff-review";
export const dynamic = "force-dynamic";
export default function StaffReviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <StaffScreenReview/>;
}

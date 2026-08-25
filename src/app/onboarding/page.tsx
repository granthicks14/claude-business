import { redirect } from "next/navigation";

/**
 * The eight-step questionnaire, retired.
 *
 * `/onboarding` and `/profile` were the same twenty-six fields implemented
 * twice — 1,210 lines between them — and `/settings` already carries a note
 * about deleting a *third* copy for exactly this reason. The difference was
 * only the shape: one asked all of them up front in eight steps, the other
 * lets you answer any of them, in any order, whenever the answer matters.
 *
 * The second shape is the right one and it was already built. Nothing is lost
 * here: `/profile` shows every unanswered field with what it costs to leave it
 * blank, and the home page's one input fills in whatever a sentence contains
 * before anybody reaches either.
 */
export default function OnboardingRedirect() {
  redirect("/profile");
}

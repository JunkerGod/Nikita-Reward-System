import { HeartBreakIcon } from "@phosphor-icons/react";
import { ButtonLink, EmptyState, PageTitle } from "../components/ui";

export function NotFound() {
  return (
    <>
      <PageTitle>Hmm</PageTitle>
      <EmptyState icon={<HeartBreakIcon size={28} aria-hidden="true" />} message="This page isnt here">
        <ButtonLink href="/">Go Home</ButtonLink>
      </EmptyState>
    </>
  );
}

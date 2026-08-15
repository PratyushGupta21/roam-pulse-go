import { createFileRoute } from "@tanstack/react-router";

import { MarketingLayout, PageHeader, Prose } from "@/components/marketing/MarketingLayout";

const TITLE = "About RoamPulse — autonomous trip recovery";
const DESCRIPTION =
  "RoamPulse is built for independent travellers who lose hours to delays, weather and manual rebooking.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <MarketingLayout>
      <PageHeader
        eyebrow="About"
        title="Built for the traveller in the middle of the disruption"
        lede="Independent travellers, backpackers, budget explorers and frequent flyers — people whose day breaks when a flight slips."
      />
      <Prose>
        <h2>Why we built it</h2>
        <p>
          Travel planning tools stop working the moment you leave. Bookings live in one app, weather in another, flight
          status in a third, and local discovery in a browser with eleven tabs. When something changes, the traveller
          becomes the integration layer.
        </p>
        <h2>What RoamPulse does differently</h2>
        <p>
          RoamPulse treats an itinerary as a monitored system. It knows which items are locked, which are flexible,
          which depend on weather and which depend on your arrival time. When a signal changes, it recalculates the day
          and proposes a concrete, costed, scored alternative — then it applies the change only within the authority
          you gave it.
        </p>
        <h2>Our operating principles</h2>
        <ul>
          <li><strong>Never invent data.</strong> Demo data is always labelled as demo data.</li>
          <li><strong>Never spend without authorisation.</strong> Autonomy applies to schedules, not to your wallet.</li>
          <li><strong>Never hide paid placement.</strong> Sponsored experiences are labelled sponsored.</li>
          <li><strong>Never leak a traveller's data.</strong> Every row is scoped to its owner at the database level.</li>
        </ul>
      </Prose>
    </MarketingLayout>
  );
}

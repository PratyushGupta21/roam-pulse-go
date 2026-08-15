import { createFileRoute } from "@tanstack/react-router";

import { MarketingLayout, PageHeader, Prose } from "@/components/marketing/MarketingLayout";

const TITLE = "Privacy Policy — RoamPulse";
const DESCRIPTION = "What trip data RoamPulse stores, how it is protected, and how to remove it.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <MarketingLayout>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        lede="Your trip data belongs to you. This page explains what we store and why."
      />
      <Prose>
        <h2>Data we store</h2>
        <ul>
          <li>Account data: email address and display name.</li>
          <li>Trip data: destinations, dates, travellers, budget, preferences and itinerary items.</li>
          <li>Operational data: disruption events, recovery recommendations, notifications and trip history.</li>
          <li>Affiliate click records: which booking link was opened, and for which trip item.</li>
        </ul>
        <h2>How it is protected</h2>
        <p>
          Every table enforces row-level security. A signed-in traveller can only read and write rows they own; trip
          child records are checked against trip ownership at the database level, not just in the interface. Provider
          credentials are stored as server-side secrets and are never sent to your browser.
        </p>
        <h2>Third parties</h2>
        <p>
          Flight, weather, mapping, price and AI providers receive only the minimum data required to answer a request
          (for example coordinates and dates). Private trip pages are excluded from search-engine indexing.
        </p>
        <h2>Deleting your data</h2>
        <p>
          Deleting a trip removes its itinerary, flights, disruptions, recommendations and history. To delete your
          account and all associated data, contact support from Settings.
        </p>
      </Prose>
    </MarketingLayout>
  );
}

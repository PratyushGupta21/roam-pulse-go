import { createFileRoute } from "@tanstack/react-router";

import { MarketingLayout, PageHeader, Prose } from "@/components/marketing/MarketingLayout";

const TITLE = "Terms of Service — RoamPulse";
const DESCRIPTION = "The rules for using RoamPulse, including automation limits, bookings and affiliate disclosure.";

export const Route = createFileRoute("/terms")({
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
  component: Terms,
});

function Terms() {
  return (
    <MarketingLayout>
      <PageHeader eyebrow="Legal" title="Terms of Service" lede="Plain-language terms for using RoamPulse." />
      <Prose>
        <h2>1. The service</h2>
        <p>
          RoamPulse generates travel itineraries and monitors them for disruptions. Recommendations are advisory.
          You remain responsible for your travel decisions, bookings and documentation.
        </p>
        <h2>2. Automation limits</h2>
        <p>
          Automation modes govern itinerary scheduling only. RoamPulse does not purchase flights, accommodation,
          tickets or experiences on your behalf, and will not do so automatically under any setting.
        </p>
        <h2>3. Provider data</h2>
        <p>
          Flight, weather and price information is supplied by third parties and may be delayed or unavailable. When
          the app runs in Demo Mode, all such data is example data and is labelled accordingly.
        </p>
        <h2>4. Affiliate disclosure</h2>
        <p>
          Some booking links are affiliate links, meaning RoamPulse may earn a commission at no additional cost to you.
          Affiliate and sponsored placements are always labelled and never disguised as organic recommendations.
        </p>
        <h2>5. Subscriptions</h2>
        <p>
          Premium features are billed monthly and can be cancelled at any time. Payment state is verified server-side
          with the payment provider.
        </p>
        <h2>6. Acceptable use</h2>
        <p>
          Do not attempt to access another traveller's data, scrape provider content in breach of provider terms, or
          use the service to violate applicable law.
        </p>
      </Prose>
    </MarketingLayout>
  );
}

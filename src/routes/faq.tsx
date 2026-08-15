import { createFileRoute } from "@tanstack/react-router";
import { HelpCircle } from "lucide-react";

import { pageBackgrounds } from "@/lib/pageBackgrounds";
import { MarketingLayout, PageHero } from "@/components/marketing/MarketingLayout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const TITLE = "RoamPulse FAQ — delays, automation, prices and providers";
const DESCRIPTION =
  "How RoamPulse detects delays, whether it books automatically, how you control changes, and where prices come from.";

const FAQS = [
  {
    q: "How does RoamPulse detect delays?",
    a: "Flight status is polled from a flight-data provider on a schedule. When the status or estimated arrival changes, the disruption workflow runs against your itinerary and calculates the impact. Without a provider configured, the app runs in Demo Mode and delays are simulated by you, clearly labelled as demo data.",
  },
  {
    q: "Does it book flights automatically?",
    a: "No. RoamPulse never purchases anything automatically, in any automation mode. It can rearrange and replace itinerary items within your limits, but any spend requires your explicit authorisation.",
  },
  {
    q: "Can I control automatic changes?",
    a: "Yes. Choose Manual, Assisted or Autonomous per trip, set a maximum additional spend, choose which categories may be replaced automatically, and mark items that must never be changed by locking them.",
  },
  {
    q: "Does it monitor weather?",
    a: "Yes. Forecast and rain probability are evaluated for outdoor activities. If an outdoor item is at risk, RoamPulse proposes nearby indoor alternatives.",
  },
  {
    q: "Where do prices come from?",
    a: "From connected providers such as Duffel, Skyscanner and accommodation partners, normalised into one comparison view. In Demo Mode, prices are examples and labelled as demo data, never presented as live quotes.",
  },
  {
    q: "Does RoamPulse charge booking fees?",
    a: "No. Booking happens with the provider. Some booking links are affiliate links and are clearly labelled.",
  },
  {
    q: "What happens if an API is unavailable?",
    a: "The affected panel degrades gracefully. You will see a message such as 'Weather data is temporarily unavailable' or the timestamp of the last successful flight update — never a stack trace, and never invented data.",
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: Faq,
});

function Faq() {
  return (
    <MarketingLayout transparentHeader>
      <PageHero
        imageSrc={pageBackgrounds.faq.imageSrc}
        imageAlt={pageBackgrounds.faq.alt}
        imagePosition={pageBackgrounds.faq.position}
        eyebrow="Direct Answers"
        title="Questions travellers"
        titleAccent="actually ask"
        lede="Straight answers about disruption detection, automation boundaries, pricing data, and system reliability."
      />

      <section className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-2 text-primary">
            <HelpCircle className="h-5 w-5" />
            <span className="font-display font-semibold text-foreground">Frequently Asked Questions</span>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            {FAQS.map((item, i) => (
              <AccordionItem
                key={item.q}
                value={`item-${i}`}
                className="rounded-xl border border-border/80 bg-background/60 px-4 transition-all hover:border-primary/40"
              >
                <AccordionTrigger className="text-left font-display font-medium text-foreground hover:text-primary transition-colors py-4">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </MarketingLayout>
  );
}

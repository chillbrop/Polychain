"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/shared/reveal";

const faqs = [
  {
    question: "How does Polychain Capital generate returns?",
    answer:
      "Polychain Capital deploys pooled capital into a diversified mix of high-yield digital asset strategies — including staking, market-making and arbitrage desks. Your daily return reflects the yield those strategies generate, paid out to your profit balance automatically each day.",
  },
  {
    question: "What is the minimum investment?",
    answer:
      "You can start with as little as $25 on the Starter plan. Each plan has clearly stated minimums, maximums, daily rates and durations, so you always know exactly what to expect before committing.",
  },
  {
    question: "How and when can I withdraw?",
    answer:
      "Withdrawals can be requested any time from your wallet page. USDT, BTC and ETH withdrawals are processed quickly, typically within minutes during business hours and are subject to a small network fee. Minimum withdrawal is $10.",
  },
  {
    question: "Is my money safe with Polychain Capital?",
    answer:
      "Security is our foundation. We use 256-bit encryption, multi-signature cold storage, quarterly audited contracts and continuous monitoring. Your account is further protected by optional two-factor authentication.",
  },
  {
    question: "How does the referral program work?",
    answer:
      "Share your unique referral link. You earn 10% commission on every investment your direct referrals make, credited instantly to your balance. There's no cap on how much you can earn.",
  },
  {
    question: "How long does the deposit take to confirm?",
    answer:
      "USDT (TRC-20) deposits typically confirm within 1-2 minutes. BTC and ETH confirm based on network congestion. Once the transaction is confirmed on-chain, it's credited to your wallet automatically.",
  },
  {
    question: "Do I need to complete KYC to invest?",
    answer:
      "Basic investing is available after email verification. Higher-value plans and large withdrawals require a quick KYC check to keep the platform secure and compliant for everyone.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="relative py-24">
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">FAQ</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
            Questions? <span className="text-gradient-gold">Answered.</span>
          </h2>
          <p className="mt-4 text-white/50">
            Everything you need to know about investing with Polychain Capital.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="glass-card mx-auto mt-12 max-w-3xl px-6 py-2">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map(({ question, answer }, i) => (
                <AccordionItem key={question} value={`item-${i}`}>
                  <AccordionTrigger className="text-left font-medium">{question}</AccordionTrigger>
                  <AccordionContent>{answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

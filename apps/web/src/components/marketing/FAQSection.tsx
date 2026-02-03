"use client";

import { FantasyFrame } from "@/components/ui/FantasyFrame";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is Lunchtable Chronicles?",
    answer:
      "Lunchtable Chronicles is a strategic card battler set in a dark fantasy world. Build powerful decks, master elemental synergies, and battle through an epic story campaign or compete against other players in ranked matches.",
  },
  {
    question: "Is it free to play?",
    answer:
      "Yes, Lunchtable Chronicles is completely free to play! All gameplay content is accessible without spending money. Optional cosmetic items are available for players who want to customize their experience.",
  },
  {
    question: "What platforms can I play on?",
    answer:
      "Currently available on web browsers (desktop and mobile). Native mobile apps for iOS and Android are coming soon!",
  },
  {
    question: "How do I get new cards?",
    answer:
      "Earn cards through gameplay progression, completing story chapters, participating in events, and achieving ranked milestones. The game rewards active players with a steady stream of new cards and resources.",
  },
  {
    question: "Is there competitive play?",
    answer:
      "Yes! Challenge other players on the ranked ladder with seasonal resets and exclusive rewards. Climb the ranks to prove your mastery and earn prestigious titles and cosmetics.",
  },
  {
    question: "How does the story mode work?",
    answer:
      "Progress through narrative chapters featuring unique AI opponents and boss battles. Each chapter unlocks new cards, lore, and gameplay mechanics as you uncover the mysteries of the Lunchtable Chronicles universe.",
  },
  {
    question: "Can I play with friends?",
    answer:
      "Yes! Challenge your friends to friendly matches to test your decks and strategies. Additional social features including tournaments and guilds are planned for future updates.",
  },
  {
    question: "How often is new content added?",
    answer:
      "We release regular updates with new cards, story chapters, and balance changes. Seasonal events occur throughout the year featuring limited-time game modes and exclusive rewards.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="w-full py-20 px-4 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Everything you need to know about getting started
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <FAQAccordionItem
                faq={faq}
                isOpen={openIndex === index}
                onToggle={() => toggleAccordion(index)}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQAccordionItem({
  faq,
  isOpen,
  onToggle,
}: {
  faq: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <FantasyFrame
      variant="obsidian"
      className={cn(
        "cursor-pointer transition-all duration-300",
        isOpen
          ? "shadow-[0_0_30px_rgba(251,191,36,0.3)] border-yellow-500/30"
          : "hover:shadow-[0_0_20px_rgba(251,191,36,0.15)]"
      )}
    >
      {/* Question Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 text-left group"
        aria-expanded={isOpen}
      >
        <h3
          className={cn(
            "text-lg md:text-xl font-semibold transition-colors duration-300",
            isOpen ? "text-yellow-400" : "text-white group-hover:text-yellow-200"
          )}
        >
          {faq.question}
        </h3>

        {/* Toggle Icon */}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={cn(
            "flex-shrink-0 transition-colors duration-300",
            isOpen ? "text-yellow-400" : "text-gray-400 group-hover:text-yellow-200"
          )}
        >
          <ChevronDown className="w-6 h-6" />
        </motion.div>
      </button>

      {/* Answer Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-yellow-500/20">
              <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative Bottom Glow */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-yellow-500/40 to-transparent rounded-full blur-sm"
        />
      )}
    </FantasyFrame>
  );
}

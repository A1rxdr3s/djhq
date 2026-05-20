"use client"

import { useState } from "react"
import { 
  Timer, 
  Music, 
  Volume2, 
  Disc3, 
  Gauge, 
  CheckSquare, 
  FileText, 
  Image,
  ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"

const tools = [
  {
    icon: Timer,
    title: "BPM to Milliseconds",
    description: "Convert BPM to delay times for precise effect timing",
    category: "Production",
  },
  {
    icon: Music,
    title: "Delay Time Calculator",
    description: "Calculate note values for tempo-synced delays",
    category: "Production",
  },
  {
    icon: Volume2,
    title: "Reverb Pre-Delay",
    description: "Find optimal pre-delay times for your reverbs",
    category: "Production",
  },
  {
    icon: Disc3,
    title: "Harmonic Mixing Helper",
    description: "Find compatible keys for smooth harmonic transitions",
    category: "DJ",
  },
  {
    icon: Gauge,
    title: "LUFS Loudness Checklist",
    description: "Ensure your masters meet streaming platform standards",
    category: "Mastering",
  },
  {
    icon: CheckSquare,
    title: "DJ Set Export Checklist",
    description: "Never forget a step when preparing your DJ sets",
    category: "DJ",
  },
  {
    icon: FileText,
    title: "Release Checklist",
    description: "Track every step from demo to distribution",
    category: "Release",
  },
  {
    icon: Image,
    title: "Press Kit Checklist",
    description: "Ensure your EPK has everything bookers need",
    category: "Marketing",
  },
]

export function ProducerToolsSection() {
  const [activeCategory, setActiveCategory] = useState("All")
  const categories = ["All", "Production", "DJ", "Mastering", "Release", "Marketing"]

  const filteredTools = activeCategory === "All" 
    ? tools 
    : tools.filter(tool => tool.category === activeCategory)

  return (
    <section id="tools" className="border-t border-border bg-card/50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-widest text-accent">Producer Tools</span>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Built-in tools for your workflow
          </h2>
          <p className="mt-4 text-muted-foreground">
            Essential calculators and checklists that every DJ and producer needs. All included free with DJHQ.
          </p>
        </div>

        {/* Category filters */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                activeCategory === category
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Tools grid */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredTools.map((tool) => (
            <div
              key={tool.title}
              className="group cursor-pointer rounded-lg border border-border bg-card p-5 transition-all hover:border-accent/50 hover:bg-card/80"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <tool.icon className="h-5 w-5 text-accent" />
                </div>
                <span className="rounded bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  {tool.category}
                </span>
              </div>
              <h3 className="mt-4 font-semibold text-foreground">{tool.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Button variant="outline" className="border-border text-foreground hover:bg-secondary">
            Explore all tools
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}

import { 
  User, 
  Link2, 
  FileText, 
  Disc3, 
  Calendar, 
  Mail, 
  Image, 
  Wrench, 
  LayoutDashboard, 
  BarChart3 
} from "lucide-react"

const features = [
  {
    icon: User,
    title: "Public DJ Profile",
    description: "A premium artist page designed for bookers, fans, and industry professionals",
  },
  {
    icon: Link2,
    title: "Smart Links",
    description: "One link for all your music, socials, and streaming platforms",
  },
  {
    icon: FileText,
    title: "Electronic Press Kit",
    description: "Professional EPK with bio, photos, tech rider, and booking info",
  },
  {
    icon: Disc3,
    title: "Release Showcase",
    description: "Beautiful display of your discography with streaming links",
  },
  {
    icon: Calendar,
    title: "Gig Calendar",
    description: "Showcase upcoming and past performances with venue details",
  },
  {
    icon: Mail,
    title: "Booking Contact",
    description: "Professional booking inquiry form with smart filtering",
  },
  {
    icon: Image,
    title: "Media Gallery",
    description: "High-resolution press photos and video content",
  },
  {
    icon: Wrench,
    title: "Producer Tools",
    description: "Built-in calculators and checklists for production workflow",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard Editor",
    description: "Intuitive control panel to manage your entire presence",
  },
  {
    icon: BarChart3,
    title: "Analytics Preview",
    description: "Track link clicks, profile views, and booking inquiries",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-widest text-accent">Features</span>
          <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything a modern DJ needs
          </h2>
          <p className="mt-4 text-muted-foreground">
            One platform to manage your entire digital presence. From public profile to private dashboard.
          </p>
        </div>

        {/* Features grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`group rounded-lg border border-border bg-card p-6 transition-all hover:border-accent/50 hover:bg-card/80 ${
                index < 2 ? "lg:col-span-2" : ""
              } ${index === 2 ? "lg:col-span-1" : ""}`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <feature.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mt-4 font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

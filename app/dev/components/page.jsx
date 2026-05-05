// DEVELOPMENT ONLY — delete before production
import ComponentShowcase from "@components/ui/ComponentShowcase"
import PrivateMode from "@components/ui/PrivateMode"

export const metadata = {
  title: "Component Showcase — UnwindAI Dev",
  robots: { index: false, follow: false },
}

export default function ComponentShowcasePage() {
  return (
    <PrivateMode>
      <ComponentShowcase />
    </PrivateMode>
  )
}

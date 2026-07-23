import HeroSection from '../components/landing/HeroSection'
import FeaturedTournaments from '../components/landing/FeaturedTournaments'
import WhyChooseUs from '../components/landing/WhyChooseUs'
import StatsSection from '../components/landing/StatsSection'

export default function Home() {
  return (
    <div className="w-full">
      <HeroSection />
      <FeaturedTournaments />
      <WhyChooseUs />
      <StatsSection />
    </div>
  )
}

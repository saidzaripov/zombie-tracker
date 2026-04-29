import { HeaderTicker } from './components/HeaderTicker';
import { ZombieFeed } from './components/ZombieFeed';
import { Footer } from './components/Footer';

export default function Page() {
  return (
    <main className="max-w-2xl mx-auto min-h-dvh">
      <HeaderTicker />
      <ZombieFeed />
      <Footer />
    </main>
  );
}

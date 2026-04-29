'use client';
import { useState } from 'react';
import { HeaderTicker } from './components/HeaderTicker';
import { ZombieFeed } from './components/ZombieFeed';
import { Footer } from './components/Footer';
import { MethodologySheet } from './components/MethodologySheet';

export default function Page() {
  const [aboutOpen, setAboutOpen] = useState(false);
  return (
    <main className="max-w-2xl mx-auto min-h-dvh">
      <HeaderTicker onAbout={() => setAboutOpen(true)} />
      <ZombieFeed />
      <Footer />
      <MethodologySheet open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </main>
  );
}

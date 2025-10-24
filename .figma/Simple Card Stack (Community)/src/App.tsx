import { useState } from "react";
import CarouselStack from "./components/CarouselStack";
import { SettingsPanel, AnimationSettings } from "./components/SettingsPanel";

export default function App() {
  const [settings, setSettings] = useState<AnimationSettings>({
    springDuration: 0.3,
    springBounce: 0.3,
    xSpringDuration: 0.5,
    xSpringBounce: 0.1,
    dragElastic: 0.7,
    swipeConfidenceThreshold: 10000,
    zIndexDelay: 0.05,
  });

  return (
    <div className="App">
      <div className="hero-container">
        <div className="container">
          <CarouselStack settings={settings} />
        </div>
      </div>
      <SettingsPanel 
        settings={settings} 
        onSettingsChange={setSettings} 
      />
    </div>
  );
}
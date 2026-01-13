import { Button } from "@/components/ui/button";
import introVideo from "@assets/FitYear_Intro_Video_(Optimized)_1768265996490.mp4";

export default function LandingPage() {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        data-testid="video-background"
      >
        <source src={introVideo} type="video/mp4" />
      </video>
      
      <div className="absolute inset-0 bg-black/30" />
      
      <div className="relative z-10 flex flex-col items-center justify-end h-full pb-16 px-4">
        <Button 
          size="lg" 
          className="text-lg px-12 py-6"
          onClick={() => window.location.href = "/api/login"}
          data-testid="button-login"
        >
          LOG IN
        </Button>
      </div>
    </div>
  );
}

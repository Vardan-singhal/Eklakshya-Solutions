import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register once on the client. Importing from here guarantees the plugin exists.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export { gsap, ScrollTrigger };

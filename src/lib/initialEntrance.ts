/** Serialized into the head so the native entrance also works before hydration. */
export function installInitialEntrance() {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  const completed = (event: AnimationEvent) => {
    if (event.animationName !== "loader-bottom") return;
    document.removeEventListener("animationend", completed);
    const root = document.documentElement;
    root.classList.remove("is-loading");
    if (root.dataset.loaderComplete !== "true") {
      root.dataset.loaderComplete = "true";
      performance.mark("preloader:complete");
    }
  };
  document.addEventListener("animationend", completed);
}

export const initialEntranceScript = `(${installInitialEntrance.toString()})();`;

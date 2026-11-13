/** Keep server-rendered sections visible; prepare their client code before entry. */
export function whenSectionNear(id: string) {
  if (typeof window === "undefined" || window.location.hash) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let view: IntersectionObserver | undefined;
    let tree: MutationObserver | undefined;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      view?.disconnect();
      tree?.disconnect();
      window.removeEventListener("ek:nav-click", finish);
      window.removeEventListener("hashchange", finish);
      window.removeEventListener("popstate", finish);
      document.removeEventListener("pointerdown", interact, true);
      document.removeEventListener("focusin", interact, true);
      resolve();
    };
    const interact = (event: Event) => {
      const section = document.getElementById(id);
      if (section?.contains(event.target as Node)) finish();
    };
    const observe = () => {
      if (settled || view) return;
      const section = document.getElementById(id);
      if (!section) return;
      tree?.disconnect();
      view = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) finish();
      }, { rootMargin: "1600px" });
      view.observe(section);
    };
    window.addEventListener("ek:nav-click", finish, { once: true });
    window.addEventListener("hashchange", finish, { once: true });
    window.addEventListener("popstate", finish, { once: true });
    document.addEventListener("pointerdown", interact, true);
    document.addEventListener("focusin", interact, true);
    if (!document.getElementById(id)) {
      tree = new MutationObserver(observe);
      tree.observe(document.documentElement, { childList: true, subtree: true });
    }
    observe();
  });
}

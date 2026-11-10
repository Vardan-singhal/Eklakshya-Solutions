type HeroStatus = "pending" | "rendered" | "fallback";

/** A first-frame latch shared by the hero and the initial page loader. */
export function createHeroReadiness() {
  let status: HeroStatus = "pending";
  const listeners = new Set<() => void>();
  const settle = (next: Exclude<HeroStatus, "pending">, failed = false) => {
    if (status === next || (status !== "pending" && !failed)) return;
    status = next;
    listeners.forEach((listener) => listener());
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  };
  return {
    subscribe,
    getSnapshot: () => status,
    getServerSnapshot: (): HeroStatus => "pending",
    rendered: () => settle("rendered"),
    fallback: () => settle("fallback", true),
    resolveCapability: (capable: boolean) => { if (!capable) settle("fallback"); },
    wait(timeoutMs = 6000) {
      let cancel = () => {};
      const promise = new Promise<void>((resolve) => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const finish = () => { clearTimeout(timer); off(); resolve(); };
        const off = subscribe(() => { if (status !== "pending") finish(); });
        cancel = finish;
        if (status !== "pending") finish();
        // A slow GPU may release the loader, but it must not lose the live scene.
        else timer = setTimeout(finish, timeoutMs);
      });
      return { promise, cancel: () => cancel() };
    },
  };
}

export const heroReadiness = createHeroReadiness();

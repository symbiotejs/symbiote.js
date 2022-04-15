export function repeatSubManager() {
  const subs = new WeakMap();

  return {
    createSub(fnCtx) {
      return (key, fn) => {
        let sub = fnCtx.sub(key, fn);
        if (!subs.has(fnCtx)) {
          subs.set(fnCtx, new Set());
        }
        subs.get(fnCtx).add(sub);
      };
    },
    removeSub(fnCtx) {
      return () => {
        if (!subs.has(fnCtx)) {
          return;
        }
        for (let sub of subs.get(fnCtx)) {
          sub.remove();
        }
        subs.delete(fnCtx);
      };
    },
  };
}

export function staticSubManager() {
  return {
    createSub(fnCtx) {
      return (key, fn) => {
        fnCtx.sub(key, fn);
      };
    },
    removeSub() {
      return () => {
        // do nothing
        // because it's supposed that fnCtx will destroy subs itself on disconnect
      };
    },
  };
}

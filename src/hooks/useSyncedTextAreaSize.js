import { useEffect, useState } from "react";

const DEFAULT_SIZE = { width: "300px", height: "300px" };

// The browser's resize handle writes inline width/height onto the textarea during a
// drag. Copying those inline values is exact whatever the padding, border or box-sizing.
const readSize = (el) => ({ width: el.style.width, height: el.style.height });
const sameSize = (a, b) => a.width === b.width && a.height === b.height;

function writeSize(el, size) {
    el.style.width = size.width;
    el.style.height = size.height;
}

function createSizeSync(initiallyLocked, initialSize) {
    // textarea -> the last inline size we wrote to it or recorded from it
    const known = new Map();
    let sharedSize = initialSize; // last synced size; new windows start at this
    let locked = initiallyLocked;
    let observer = null;
    let frame = null;
    let dragged = null;

    function flush() {
        frame = null;
        const source = dragged;
        dragged = null;
        if (!locked || !known.has(source)) return;

        // Read the dragged textarea now, so the others get its most recent size.
        sharedSize = readSize(source);
        for (const el of known.keys()) {
            if (el === source || sameSize(known.get(el), sharedSize)) continue;
            writeSize(el, sharedSize);
            // Record what we wrote so this textarea's own observer callback is ignored.
            known.set(el, readSize(el));
        }
    }

    function handleResize(entries) {
        for (const { target } of entries) {
            if (!known.has(target)) continue;
            const size = readSize(target);
            // Unchanged inline size: our own write echoing back, the first callback
            // after observe(), or a layout change. Only a user drag gets past this.
            if (sameSize(size, known.get(target))) continue;

            known.set(target, size); // tracked even while unlocked
            if (!locked) continue;

            dragged = target;
            if (frame === null) frame = requestAnimationFrame(flush);
        }
    }

    // Call when a window mounts; the returned function is its cleanup.
    function register(el) {
        writeSize(el, sharedSize);
        known.set(el, readSize(el));
        if (!observer) observer = new ResizeObserver(handleResize);
        observer.observe(el);

        return () => {
            observer?.unobserve(el);
            known.delete(el);
        };
    }

    function setLocked(value) {
        locked = value;
    }

    function destroy() {
        observer?.disconnect();
        observer = null;
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        dragged = null;
    }

    return { register, setLocked, destroy };
}

export function useSyncedTextAreaSize(locked, initialSize = DEFAULT_SIZE) {
    const [sync] = useState(() => createSizeSync(locked, initialSize));

    useEffect(() => {
        sync.setLocked(locked);
    }, [sync, locked]);

    useEffect(() => () => sync.destroy(), [sync]);

    return sync.register;
}
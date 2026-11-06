import { animate, motionValue } from "motion";

const MAX_TILT = 8;
const HOVER_SCALE = 1.02;
const SPRING = { type: "spring", stiffness: 260, damping: 26, mass: 0.6 } as const;

/** Spring-driven tilt for one card. Kept in its own chunk, so Motion only downloads when someone hovers a card. */
export function createTilt(card: HTMLElement, shine: HTMLElement) {
  const rotateX = motionValue(0);
  const rotateY = motionValue(0);
  const scale = motionValue(1);

  const render = () => {
    card.style.transform = `rotateX(${rotateX.get()}deg) rotateY(${rotateY.get()}deg) scale(${scale.get()})`;
  };
  const unsubscribe = [rotateX, rotateY, scale].map((value) => value.on("change", render));

  return {
    /** x and y run from -0.5 to 0.5 across the card. */
    move(x: number, y: number) {
      animate(rotateX, -y * 2 * MAX_TILT, SPRING);
      animate(rotateY, x * 2 * MAX_TILT, SPRING);
      animate(scale, HOVER_SCALE, SPRING);
      shine.style.opacity = "1";
      shine.style.transform = `translate3d(${x * 100}%, ${y * 100}%, 0) scale(1.5)`;
    },
    leave() {
      animate(rotateX, 0, SPRING);
      animate(rotateY, 0, SPRING);
      animate(scale, 1, SPRING);
      shine.style.opacity = "0";
    },
    destroy() {
      unsubscribe.forEach((stop) => stop());
      [rotateX, rotateY, scale].forEach((value) => value.destroy());
    },
  };
}

export type TiltEngine = ReturnType<typeof createTilt>;

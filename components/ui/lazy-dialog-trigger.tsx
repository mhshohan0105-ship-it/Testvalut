"use client";

import { cloneElement, useState, type ComponentType, type ReactElement } from "react";

type DialogProps = { open: boolean; onOpenChange: (open: boolean) => void };
type TriggerProps = { onClick?: () => void; onPointerEnter?: () => void; onFocus?: () => void };

/** Shows a button right away and fetches the dialog, with its form libraries, when it's about to be used. */
export function LazyDialogTrigger<P extends object>({
  load,
  props,
  trigger,
}: {
  load: () => Promise<ComponentType<P & DialogProps>>;
  props: P;
  trigger: ReactElement<TriggerProps>;
}) {
  const [Dialog, setDialog] = useState<ComponentType<P & DialogProps> | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      {cloneElement(trigger, {
        onPointerEnter: () => void load(),
        onFocus: () => void load(),
        onClick: () =>
          void load().then((loaded) => {
            setDialog(() => loaded);
            setOpen(true);
          }),
      })}
      {Dialog && <Dialog {...props} open={open} onOpenChange={setOpen} />}
    </>
  );
}

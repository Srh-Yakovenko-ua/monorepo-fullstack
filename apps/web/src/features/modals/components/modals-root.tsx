import { type ComponentType, type ReactElement, Suspense, useEffect, useState } from "react";

import { type ModalEntry, type ModalEvent, modalObserver } from "../lib/modal-observer";
import { modalComponents, type ModalId, type ModalPayloads } from "../lib/modal-registry";

export function ModalsRoot() {
  const [modals, setModals] = useState<Map<ModalId, ModalEntry>>(() => new Map());

  useEffect(() => {
    const handler = ({ entry, id }: ModalEvent) => {
      setModals((prev) => {
        const next = new Map(prev);
        if (!entry || !entry.isOpen) {
          if (!next.delete(id)) return prev;
          return next;
        }
        next.set(id, entry);
        return next;
      });
    };
    return modalObserver.subscribe(handler);
  }, []);

  const slots: ReactElement[] = [];
  modals.forEach((entry, id) => {
    slots.push(<ModalSlot entry={entry} id={id} key={id} />);
  });
  return <>{slots}</>;
}

function ModalSlot<K extends ModalId>({ entry, id }: { entry: ModalEntry<K>; id: K }) {
  const Component: ComponentType<{
    isOpen: boolean;
    props: ModalPayloads[K];
  }> = modalComponents[id];
  return (
    <Suspense fallback={null}>
      <Component isOpen={entry.isOpen} props={entry.props} />
    </Suspense>
  );
}

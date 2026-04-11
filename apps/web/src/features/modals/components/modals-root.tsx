import { type ComponentType, Suspense, useEffect, useState } from "react";

import { type ModalEntry, type ModalEvent, modalObserver } from "../lib/modal-observer";
import { modalComponents, type ModalId, type ModalPayloads } from "../lib/modal-registry";

type ModalsState = { [K in ModalId]?: ModalEntry<K> };

export function ModalsRoot() {
  const [modals, setModals] = useState<ModalsState>({});

  useEffect(() => {
    const handler = ({ entry, id }: ModalEvent) => {
      setModals((prev) => {
        if (!entry || !entry.isOpen) {
          if (!prev[id]) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        }
        return { ...prev, [id]: entry };
      });
    };
    return modalObserver.subscribe(handler);
  }, []);

  return (
    <>
      {(Object.entries(modals) as [ModalId, ModalEntry][]).map(([id, entry]) => (
        <ModalSlot entry={entry} id={id} key={id} />
      ))}
    </>
  );
}

function ModalSlot<K extends ModalId>({ entry, id }: { entry: ModalEntry<K>; id: K }) {
  const Component = modalComponents[id] as ComponentType<{
    isOpen: boolean;
    props: ModalPayloads[K];
  }>;
  return (
    <Suspense fallback={null}>
      <Component isOpen={entry.isOpen} props={entry.props} />
    </Suspense>
  );
}

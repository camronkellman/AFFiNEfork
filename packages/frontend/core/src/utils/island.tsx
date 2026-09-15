import { LiveData, useLiveData } from '@toeverything/infra';
import { nanoid } from 'nanoid';
import {
  forwardRef,
  type Ref,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';

export const createIsland = () => {
  const targetLiveData$ = new LiveData<HTMLDivElement | null>(null);
  const provided$ = new LiveData<boolean>(false);
  let mountedTarget: HTMLDivElement | null = null;
  return {
    id: nanoid(),
    Target: forwardRef(function IslandTarget(
      { ...other }: React.HTMLProps<HTMLDivElement>,
      ref: Ref<HTMLDivElement>
    ) {
      const target = useRef<HTMLDivElement | null>(null);

      useImperativeHandle(ref, () => target.current as HTMLDivElement, []);
      useEffect(() => {
        const element = target.current;
        mountedTarget = element;
        targetLiveData$.next(element);
        return () => {
          if (mountedTarget !== element) return;
          mountedTarget = null;
          targetLiveData$.next(null);
        };
      }, []);
      return <div {...other} ref={target}></div>;
    }),
    Provider: ({ children }: React.PropsWithChildren) => {
      const target = useLiveData(targetLiveData$);
      useEffect(() => {
        if (provided$.value === true && BUILD_CONFIG.debug) {
          throw new Error('Island should not be provided more than once');
        }
        provided$.next(true);
        return () => {
          provided$.next(false);
        };
      }, []);
      return target ? createPortal(children, target) : null;
    },
    provided$,
  };
};

export type Island = ReturnType<typeof createIsland>;

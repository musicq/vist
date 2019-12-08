import { RefObject } from 'react';
import { combineLatest, fromEvent, Observable } from 'rxjs';
import { debounceTime, filter, map, pairwise, skipWhile, startWith, tap, withLatestFrom } from 'rxjs/operators';
import { IVirtualListOptions } from './VirtualList';

function validateOptions(options: IVirtualListOptions): void {
  if (!Reflect.has(options, 'height') || options.height === undefined) {
    throw new Error(`[Vist] You need to pass a valid 'options.height'.`);
  }
}

function defaultOptions(options: IVirtualListOptions): IVirtualListOptions {
  const opt = { ...options };

  opt.sticky = Reflect.has(opt, 'sticky') ? opt.sticky : true;
  opt.spare = Reflect.has(opt, 'spare') ? opt.spare : 3;
  opt.startIndex = Reflect.has(opt, 'startIndex') ? opt.startIndex : 0;
  opt.resize = Reflect.has(opt, 'resize') ? opt.resize : true;

  return opt;
}

export function useOptions(options$: Observable<IVirtualListOptions>): Observable<IVirtualListOptions> {
  return options$
    .pipe(
      tap(validateOptions),
      map(defaultOptions)
    );
}

export function useContainerHeight(
  containerRef: RefObject<HTMLDivElement>,
  options$: Observable<IVirtualListOptions>
): Observable<number> {
  return fromEvent(window, 'resize')
    .pipe(
      filter(() => containerRef.current !== null),
      withLatestFrom(options$),
      skipWhile(([_, options]) => !options.resize),
      startWith(null),
      debounceTime(200),
      map(() => containerRef.current!.clientHeight)
    );
}

export function useScrollTop(el: HTMLElement): Observable<number> {
  const scrollEvent$ = fromEvent(el, 'scroll').pipe(
    startWith({ target: { scrollTop: 0 } })
  );

  return scrollEvent$.pipe(map(e => (e.target as HTMLElement).scrollTop));
}

export function userScrollToPosition(options$: Observable<IVirtualListOptions>): Observable<number> {
  return options$.pipe(
    map(option => option.startIndex! * option.height)
  );
}

export function useStickyTop<T>(data$: Observable<T[]>, options$: Observable<IVirtualListOptions>) {
  return data$
    .pipe(
      withLatestFrom(options$),
      filter(([_, options]) => options.sticky!)
    );
}

export function useScrollDirection(scrollTop$: Observable<number>): Observable<number> {
  return scrollTop$.pipe(
    pairwise(),
    map(([p, n]) => (n - p > 0 ? 1 : -1)),
    startWith(1)
  );
}

export function useActualRows(
  containerHeight$: Observable<number>,
  options$: Observable<IVirtualListOptions>
): Observable<number> {
  return combineLatest([containerHeight$, options$]).pipe(
    map(([ch, option]) => Math.ceil(ch / option.height) + option.spare!)
  );
}

export function useIndices(
  scrollTop$: Observable<number>,
  options$: Observable<IVirtualListOptions>
): Observable<number> {
  return combineLatest([scrollTop$, options$]).pipe(
    // the index of the top elements of the current list
    map(([st, options]) => Math.floor((st as any) / options.height))
  );
}

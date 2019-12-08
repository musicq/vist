import * as React from 'react';
import { fromEvent, Observable } from 'rxjs';
import { debounceTime, filter, map, skipWhile, startWith, tap, withLatestFrom } from 'rxjs/operators';
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
  containerRef: React.RefObject<HTMLDivElement>,
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

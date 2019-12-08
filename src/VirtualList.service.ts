import { RefObject } from 'react';
import { combineLatest, fromEvent, Observable } from 'rxjs';
import { debounceTime, filter, map, pairwise, skipWhile, startWith, tap, withLatestFrom } from 'rxjs/operators';
import { IDataItem, IVirtualListOptions } from './VirtualList';

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

let lastFirstIndex = -1;
let actualRowsSnapshot = 0;

export function useIndicesInViewport<T>(
  indices$: Observable<number>,
  data$: Observable<T[]>,
  actualRows$: Observable<number>
): Observable<[number, number]> {
  return combineLatest([indices$, data$, actualRows$]).pipe(
    map(([curIndex, data, actualRows]) => {
      // the first index of the virtualList on the last screen, if < 0, reset to 0
      const maxIndex = data.length - actualRows < 0 ? 0 : data.length - actualRows;
      return [Math.min(curIndex, maxIndex), actualRows];
    }),
    // if the index or actual rows changed, then update
    filter(([curIndex, actualRows]) => curIndex !== lastFirstIndex || actualRows !== actualRowsSnapshot),
    // update the index
    tap(([curIndex]) => (lastFirstIndex = curIndex)),
    map(([firstIndex, actualRows]) => {
      const lastIndex = firstIndex + actualRows - 1;
      return [firstIndex, lastIndex];
    })
  );
}

let stateDataSnapshot: Array<IDataItem<any>> = [];
let dataReference: any[] = [];

export function useDataSliceInView<T>(
  data$: Observable<T[]>,
  options$: Observable<IVirtualListOptions>,
  indicesInView$: Observable<[number, number]>,
  scrollDirection$: Observable<number>,
  actualRows$: Observable<number>
): Observable<Array<IDataItem<T>>> {
  return combineLatest([data$, options$, indicesInView$]).pipe(
    withLatestFrom(scrollDirection$, actualRows$),
    map(([[data, options, [firstIndex, lastIndex]], dir, actualRows]) => {
      const dataSlice = stateDataSnapshot;
      // compare data reference, if not the same, then update the list
      const dataReferenceIsSame = data === dataReference;

      // fill the list
      if (!dataSlice.length || !dataReferenceIsSame || actualRows !== actualRowsSnapshot) {
        if (!dataReferenceIsSame) {
          dataReference = data;
        }

        if (actualRows !== actualRowsSnapshot) {
          actualRowsSnapshot = actualRows;
        }

        return (stateDataSnapshot = data.slice(firstIndex, lastIndex + 1).map(item => ({
          origin: item,
          $pos: firstIndex * options.height,
          $index: firstIndex++
        })));
      }

      // reuse the existing elements
      const diffSliceIndexes = getDifferenceIndexes(dataSlice, firstIndex, lastIndex);
      let newIndex = dir > 0 ? lastIndex - diffSliceIndexes.length + 1 : firstIndex;

      diffSliceIndexes.forEach(index => {
        const item = dataSlice[index];
        item.origin = data[newIndex];
        item.$pos = newIndex * options.height;
        item.$index = newIndex++;
      });

      return (stateDataSnapshot = dataSlice);
    })
  );
}

function getDifferenceIndexes<T>(slice: Array<IDataItem<T>>, firstIndex: number, lastIndex: number): number[] {
  const indexes: number[] = [];

  slice.forEach((item, i) => {
    if (item.$index < firstIndex || item.$index > lastIndex) {
      indexes.push(i);
    }
  });

  return indexes;
}

export function useScrollHeight<T>(
  data$: Observable<T[]>,
  options$: Observable<IVirtualListOptions>
): Observable<number> {
  return combineLatest([data$, options$]).pipe(
    map(([data, option]) => data.length * option.height)
  );
}

import * as React from 'react';
import { BehaviorSubject, combineLatest, fromEvent, Observable, Subscription } from 'rxjs';
import { debounceTime, filter, map, startWith, tap, withLatestFrom } from 'rxjs/operators';
import style from './VirtualList.css';

interface IVirtualListOptions {
  height: number;
  spare?: number;
  sticky?: boolean;
}

interface IVirtualListProps<T> {
  data$: Observable<T[]>;
  options$: Observable<IVirtualListOptions>;
  style?: any;
}

interface IDataItem<T> {
  origin: T,
  $index: number,
  $pos: number
}

interface IVirtualListState<T> {
  data: Array<IDataItem<T>>;
  scrollHeight: number;
}

export class VirtualList<T> extends React.Component<Readonly<IVirtualListProps<T>>, IVirtualListState<T>> {
  state = {
    data: [] as Array<IDataItem<T>>,
    scrollHeight: 0
  };

  // snapshot of data property in state
  private stateDataSnapshot: Array<IDataItem<T>> = [];
  // snapshot of actualRows
  private actualRowsSnapshot: number = 0;
  // record data reference
  private dataReference: T[] = [];
  // container dom instance
  private virtualListRef = React.createRef<HTMLDivElement>();
  // container height
  private containerHeight$ = new BehaviorSubject<number>(0);
  // scroll events
  private scrollWin$: Observable<any>;
  // last first index of data for the first element of the virtual list
  private lastFirstIndex = -1;
  // record the position of last scroll
  private lastScrollPos = 0;

  private _subs: Subscription[] = [];

  componentDidMount() {
    const virtualListElm = this.virtualListRef.current as HTMLElement;

    const options$ = this.props.options$.pipe(
      tap(options => {
        if (options.height === undefined) {
          throw new Error('Vist needs a height property in options$');
        }
      }),
      map(options => {
        const opt: IVirtualListOptions = Object.assign({}, options);
        opt.sticky = opt.sticky === undefined ? true : opt.sticky;
        opt.spare = opt.spare === undefined ? 3 : opt.spare;

        return opt;
      })
    );

    // window resize
    this._subs.push(
      fromEvent(window, 'resize').pipe(
        startWith(null),
        debounceTime(200),
        map(() => this.containerHeight$.next(virtualListElm.clientHeight))
      ).subscribe()
    );

    // scroll events
    this.scrollWin$ = fromEvent(virtualListElm, 'scroll').pipe(
      startWith({ target: { scrollTop: this.lastScrollPos } })
    );

    // scroll direction Down/Up
    const scrollDirection$ = this.scrollWin$.pipe(
      map(e => (e.target as HTMLElement).scrollTop),
      map(scrollTop => {
        const dir = scrollTop - this.lastScrollPos;
        this.lastScrollPos = scrollTop;
        return dir > 0 ? 1 : -1;
      })
    );

    // actual rows
    const actualRows$ = combineLatest(this.containerHeight$, options$).pipe(
      map(([ch, option]) => Math.ceil(ch / option.height) + (option.spare || 3))
    );

    // let the scroll bar stick the top
    this._subs.push(
      this.props.data$.pipe(withLatestFrom(options$))
        .subscribe(([_, options]) => {
          if (options.sticky === undefined || options.sticky) {
            virtualListElm.scrollTo(0, 0);
          }
        })
    );

    // if it's necessary to update the view
    const shouldUpdate$ = combineLatest(
      this.scrollWin$.pipe(map(() => virtualListElm.scrollTop)),
      options$,
      this.props.data$,
      actualRows$
    ).pipe(
      // the index of the top elements of the current list
      map(([st, options, data, actualRows]) => {
        const curIndex = Math.floor(st / options.height);
        // the first index of the virtualList on the last screen, if < 0, reset to 0
        const maxIndex = data.length - actualRows < 0 ? 0 : data.length - actualRows;
        return [curIndex > maxIndex ? maxIndex : curIndex, actualRows];
      }),
      // if the index or actual rows changed, then update
      filter(([curIndex, actualRows]) => curIndex !== this.lastFirstIndex || actualRows !== this.actualRowsSnapshot),
      // update the index
      tap(([curIndex]) => this.lastFirstIndex = curIndex),
      map(([firstIndex, actualRows]) => {
        const lastIndex = firstIndex + actualRows - 1;
        return [firstIndex, lastIndex];
      })
    );

    // data slice in the view
    const dataInViewSlice$ = combineLatest(this.props.data$, options$, shouldUpdate$).pipe(
      withLatestFrom(scrollDirection$, actualRows$),
      map(([[data, options, [firstIndex, lastIndex]], dir, actualRows]) => {
        const dataSlice = this.stateDataSnapshot;
        // compare data reference, if not the same, then update the list
        const dataReferenceIsSame = data === this.dataReference;

        // fill the list
        if (!dataSlice.length || !dataReferenceIsSame || actualRows !== this.actualRowsSnapshot) {
          if (!dataReferenceIsSame) {
            this.dataReference = data;
          }

          if (actualRows !== this.actualRowsSnapshot) {
            this.actualRowsSnapshot = actualRows;
          }

          return this.stateDataSnapshot = data.slice(firstIndex, lastIndex + 1).map(item => ({
            origin: item,
            $pos: firstIndex * options.height,
            $index: firstIndex++
          }));
        }

        // reuse the existing elements
        const diffSliceIndexes = this.getDifferenceIndexes(dataSlice, firstIndex, lastIndex);
        let newIndex = dir > 0 ? lastIndex - diffSliceIndexes.length + 1 : firstIndex;

        diffSliceIndexes.forEach(index => {
          const item = dataSlice[index];
          item.origin = data[newIndex];
          item.$pos = newIndex * options.height;
          item.$index = newIndex++;
        });

        return this.stateDataSnapshot = dataSlice;
      })
    );

    // total height of the virtual list
    const scrollHeight$ = combineLatest(this.props.data$, options$).pipe(
      map(([data, option]) => data.length * option.height)
    );

    // subscribe to update the view
    this._subs.push(
      combineLatest(dataInViewSlice$, scrollHeight$)
        .subscribe(([data, scrollHeight]) => this.setState({ data, scrollHeight }))
    );
  }

  componentWillUnmount() {
    this._subs.forEach(stream$ => stream$.unsubscribe());
    this.containerHeight$.complete();
  }

  render() {
    return (
      <div className={style.VirtualList} ref={this.virtualListRef} style={this.props.style}>
        <div className={style.VirtualListContainer} style={{ height: this.state.scrollHeight }}>
          {this.state.data.map((data, i) =>
            <div
              key={i}
              className={style.VirtualListPlaceholder}
              style={{ transform: `translateY(${data.$pos}px)` }}
            >
              {data.origin ? (this.props.children as any)(data.origin) : null}
            </div>)}
        </div>
      </div>
    );
  }

  private getDifferenceIndexes(slice: Array<IDataItem<T>>, firstIndex: number, lastIndex: number): number[] {
    const indexes: number[] = [];

    slice.forEach((item, i) => {
      if (item.$index < firstIndex || item.$index > lastIndex) {
        indexes.push(i);
      }
    });

    return indexes;
  }
}

import * as React from 'react';
import { BehaviorSubject, combineLatest, fromEvent, Observable } from 'rxjs';
import { filter, map, startWith, tap, withLatestFrom } from 'rxjs/operators';
import style from './VirtualList.css';

interface IVirtualListOptions {
  height: number;
  spare?: number;
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

  // container dom instance
  private virtualListRef = React.createRef<HTMLDivElement>();
  // container height
  private containerHeight$ = new BehaviorSubject<number>(0);
  // scroll events
  private scrollWin$: Observable<any> = new BehaviorSubject(null);
  // last first index of data for the first element of the virtual list
  private lastFirstIndex = -1;
  // record the position of last scroll
  private lastScrollPos = 0;

  componentDidMount() {
    const virtualListElm = this.virtualListRef.current as HTMLElement;

    this.containerHeight$.next(virtualListElm.clientHeight);
    this.scrollWin$ = fromEvent(virtualListElm, 'scroll').pipe(
      startWith({ target: { scrollTop: this.lastScrollPos } })
    );

    // scroll direction Down/Up
    const scrollDirection$ = this.scrollWin$.pipe(
      map(e => {
        const scrollTop = (e.target as HTMLElement).scrollTop;
        const dir = scrollTop - this.lastScrollPos;
        this.lastScrollPos = scrollTop;

        return dir > 0 ? 1 : -1;
      })
    );

    // actual rows
    const actualRows$ = combineLatest(this.containerHeight$, this.props.options$).pipe(
      map(([ch, option]) => Math.ceil(ch / option.height) + (option.spare || 3))
    );

    // if it's necessary to update the view
    const shouldUpdate$ = combineLatest(
      this.scrollWin$.pipe(map(() => virtualListElm.scrollTop)),
      this.props.options$
    ).pipe(
      // the index of the top elements of the current list
      map(([st, options]) => {
        return Math.floor(st / options.height);
      }),
      // if the index changed, then update
      filter(curIndex => curIndex !== this.lastFirstIndex),
      // update the index
      tap(curIndex => this.lastFirstIndex = curIndex)
    );

    // data slice in the view
    const dataInViewSlice$ = combineLatest(this.props.data$, this.props.options$, actualRows$, shouldUpdate$).pipe(
      withLatestFrom(scrollDirection$),
      // @ts-ignore
      map(([[data, options, actualRows, curFirstIndex], dir]) => {
        const lastIndex = curFirstIndex + actualRows - 1;

        // TODO: optimize here, only change the corresponding element instead of change the whole list
        // reuse the exist element instead destroy and recreate one
        // fill the list
        return data.slice(curFirstIndex, lastIndex).map(item => ({
          origin: item,
          $pos: curFirstIndex * options.height,
          $index: curFirstIndex++
        }));
      })
    );

    // total height of the virtual list
    const scrollHeight$ = combineLatest(this.props.data$, this.props.options$).pipe(
      map(([data, option]) => data.length * option.height)
    );

    // subscribe to update the view
    combineLatest(dataInViewSlice$, scrollHeight$)
      .subscribe(([data, scrollHeight]) => this.setState({ data, scrollHeight }));
  }

  render() {
    return (
      <div className={style.VirtualList} ref={this.virtualListRef} style={this.props.style}>
        <div className={style.VirtualListContainer} style={{ height: this.state.scrollHeight }}>
          {this.state.data.map(data =>
            <div
              key={data.$index}
              className={style.VirtualListPlaceholder}
              style={{ transform: `translateY(${data.$pos}px)` }}
            >
              {(this.props.children as any)(data.origin)}
            </div>)}
        </div>
      </div>
    );
  }
}

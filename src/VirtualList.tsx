import * as React from 'react';
import { combineLatest, merge, Observable, Subscription } from 'rxjs';
import { filter, map, mapTo, mergeAll, tap, withLatestFrom } from 'rxjs/operators';
import style from './VirtualList.css';
import {
  useActualRows,
  useContainerHeight,
  useIndices,
  useOptions,
  userScrollToPosition,
  useScrollDirection,
  useScrollTop,
  useStickyTop
} from './VirtualList.service';

export interface IVirtualListOptions {
  height: number;
  spare?: number;
  sticky?: boolean;
  startIndex?: number;
  resize?: boolean;
}

export interface IVirtualListProps<T> {
  data$: Observable<T[]>;
  options$: Observable<IVirtualListOptions>;
  style?: any;
}

interface IDataItem<T> {
  origin: T;
  $index: number;
  $pos: number;
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
  // last first index of data for the first element of the virtual list
  private lastFirstIndex = -1;

  private subs = new Subscription();

  componentDidMount() {
    const virtualListElm = this.virtualListRef.current as HTMLElement;
    const options$ = useOptions(this.props.options$);
    const containerHeight$ = useContainerHeight(this.virtualListRef, options$);
    const scrollTop$ = useScrollTop(virtualListElm);
    const scrollDirection$ = useScrollDirection(scrollTop$);
    const actualRows$ = useActualRows(containerHeight$, options$);
    const indices$ = useIndices(scrollTop$, options$);

    const scrollTo$ = merge([
      userScrollToPosition(options$),
      useStickyTop(this.props.data$, options$).pipe(mapTo(0))
    ]).pipe(mergeAll());

    this.subs.add(
      scrollTo$.subscribe(scrollTop => virtualListElm.scrollTop = scrollTop)
    );


    // if it's necessary to update the view
    const shouldUpdate$ = combineLatest([indices$, this.props.data$, actualRows$]).pipe(
      map(([curIndex, data, actualRows]) => {
        // the first index of the virtualList on the last screen, if < 0, reset to 0
        const maxIndex = data.length - actualRows < 0 ? 0 : data.length - actualRows;
        return [Math.min(curIndex, maxIndex), actualRows];
      }),
      // if the index or actual rows changed, then update
      filter(([curIndex, actualRows]) => curIndex !== this.lastFirstIndex || actualRows !== this.actualRowsSnapshot),
      // update the index
      tap(([curIndex]) => (this.lastFirstIndex = curIndex)),
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

          return (this.stateDataSnapshot = data.slice(firstIndex, lastIndex + 1).map(item => ({
            origin: item,
            $pos: firstIndex * options.height,
            $index: firstIndex++
          })));
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

        return (this.stateDataSnapshot = dataSlice);
      })
    );

    // total height of the virtual list
    const scrollHeight$ = combineLatest(this.props.data$, options$).pipe(
      map(([data, option]) => data.length * option.height)
    );

    // subscribe to update the view
    this.subs.add(
      combineLatest(dataInViewSlice$, scrollHeight$).subscribe(([data, scrollHeight]) =>
        this.setState({ data, scrollHeight })
      )
    );
  }

  componentWillUnmount() {
    this.subs.unsubscribe();
  }

  render() {
    return (
      <div className={style.VirtualList} ref={this.virtualListRef} style={this.props.style}>
        <div className={style.VirtualListContainer} style={{ height: this.state.scrollHeight }}>
          {this.state.data.map((data, i) => (
            <div key={i} className={style.VirtualListPlaceholder} style={{ top: data.$pos + 'px' }}>
              {data.origin !== undefined ? (this.props.children as any)(data.origin, data.$index) : null}
            </div>
          ))}
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

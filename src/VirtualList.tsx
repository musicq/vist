import * as React from 'react';
import { combineLatest, merge, Observable, Subscription } from 'rxjs';
import { mapTo, mergeAll } from 'rxjs/operators';
import style from './VirtualList.css';
import {
  useActualRows,
  useContainerHeight,
  useDataSliceInView,
  useIndices,
  useIndicesInViewport,
  useOptions,
  userScrollToPosition,
  useScrollDirection,
  useScrollHeight,
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
  style?: { [key: string]: number | string };
  className?: string;
  keepDom?: boolean;
  uniqKey?: string;
}

export interface IDataItem<T> {
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

  // container dom instance
  private virtualListRef = React.createRef<HTMLDivElement>();
  private subs = new Subscription();

  componentDidMount() {
    const virtualListElm = this.virtualListRef.current as HTMLElement;
    const options$ = useOptions(this.props.options$);
    const containerHeight$ = useContainerHeight(this.virtualListRef, options$);
    const scrollTop$ = useScrollTop(virtualListElm);
    const scrollDirection$ = useScrollDirection(scrollTop$);
    const actualRows$ = useActualRows(containerHeight$, options$);
    const indices$ = useIndices(scrollTop$, options$);
    const indicesInView$ = useIndicesInViewport(indices$, this.props.data$, actualRows$);
    const dataSliceInView$ = useDataSliceInView(
      this.props.data$, options$, indicesInView$, scrollDirection$, actualRows$);
    const scrollHeight$ = useScrollHeight(this.props.data$, options$);

    const scrollTo$ = merge([
      userScrollToPosition(options$),
      useStickyTop(this.props.data$, options$).pipe(mapTo(0))
    ]).pipe(mergeAll());

    this.subs.add(
      scrollTo$.subscribe(scrollTop => virtualListElm.scrollTop = scrollTop)
    );

    this.subs.add(
      combineLatest([dataSliceInView$, scrollHeight$])
        .subscribe(([data, scrollHeight]) =>
          this.setState({ data, scrollHeight })
        )
    );
  }

  componentWillUnmount() {
    this.subs.unsubscribe();
  }

  render() {
    const cls = `${style.VirtualList} ${this.props.className || ''}`;

    return (
      <div className={cls} ref={this.virtualListRef} style={this.props.style}>
        <div className={style.VirtualListContainer} style={{ height: this.state.scrollHeight }}>
          {this.state.data.map((data, i) => (
            <div
              key={this.props.keepDom ? i : (this.props.uniqKey ? data.origin[this.props.uniqKey] : i)}
              className={style.VirtualListPlaceholder}
              style={{ top: data.$pos }}
            >
              {data.origin !== undefined ? (this.props.children as any)(data.origin, data.$index) : null}
            </div>
          ))}
        </div>
      </div>
    );
  }
}

import * as React from 'react';
import { Observable } from 'rxjs';
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
export declare class VirtualList<T> extends React.Component<Readonly<IVirtualListProps<T>>, IVirtualListState<T>> {
    state: {
        data: IDataItem<T>[];
        scrollHeight: number;
    };
    private stateDataSnapshot;
    private actualRowsSnapshot;
    private dataReference;
    private virtualListRef;
    private containerHeight$;
    private lastFirstIndex;
    private lastScrollPos;
    private options$;
    private _subs;
    componentDidMount(): void;
    componentWillUnmount(): void;
    render(): JSX.Element;
    private getDifferenceIndexes;
}
export {};

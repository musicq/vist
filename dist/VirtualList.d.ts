import * as React from 'react';
import { Observable } from 'rxjs';
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
    private virtualListRef;
    private containerHeight$;
    private scrollWin$;
    private lastFirstIndex;
    private lastScrollPos;
    componentDidMount(): void;
    render(): JSX.Element;
}
export {};

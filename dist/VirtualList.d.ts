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
    style?: {
        [key: string]: number | string;
    };
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
export declare class VirtualList<T> extends React.Component<Readonly<IVirtualListProps<T>>, IVirtualListState<T>> {
    state: {
        data: IDataItem<T>[];
        scrollHeight: number;
    };
    private virtualListRef;
    private subs;
    componentDidMount(): void;
    componentWillUnmount(): void;
    render(): JSX.Element;
}
export {};

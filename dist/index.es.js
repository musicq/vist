import { createRef, createElement, Component } from 'react';
import { BehaviorSubject, combineLatest, fromEvent, ReplaySubject, Subscription } from 'rxjs';
import { debounceTime, filter, map, pairwise, skipWhile, startWith, tap, withLatestFrom } from 'rxjs/operators';

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

function styleInject(css, ref) {
  if ( ref === void 0 ) ref = {};
  var insertAt = ref.insertAt;

  if (!css || typeof document === 'undefined') { return; }

  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';

  if (insertAt === 'top') {
    if (head.firstChild) {
      head.insertBefore(style, head.firstChild);
    } else {
      head.appendChild(style);
    }
  } else {
    head.appendChild(style);
  }

  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
}

var css = ".VirtualList_VirtualList__1SA8j {\n  overflow-y: auto;\n}\n\n.VirtualList_VirtualListContainer__xe2yw {\n  position: relative;\n}\n\n.VirtualList_VirtualListPlaceholder__12jc2 {\n  position: absolute;\n  width: 100%;\n}\n";
var style = {"VirtualList":"VirtualList_VirtualList__1SA8j","VirtualListContainer":"VirtualList_VirtualListContainer__xe2yw","VirtualListPlaceholder":"VirtualList_VirtualListPlaceholder__12jc2"};
styleInject(css);

var VirtualList = /** @class */ (function (_super) {
    __extends(VirtualList, _super);
    function VirtualList() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.state = {
            data: [],
            scrollHeight: 0
        };
        // snapshot of data property in state
        _this.stateDataSnapshot = [];
        // snapshot of actualRows
        _this.actualRowsSnapshot = 0;
        // record data reference
        _this.dataReference = [];
        // container dom instance
        _this.virtualListRef = createRef();
        // container height
        _this.containerHeight$ = new BehaviorSubject(0);
        // last first index of data for the first element of the virtual list
        _this.lastFirstIndex = -1;
        // record the position of last scroll
        _this.lastScrollPos = 0;
        // options$ to keep the latest options from the input
        _this.options$ = new ReplaySubject(1);
        _this.subs = new Subscription();
        return _this;
    }
    VirtualList.prototype.componentDidMount = function () {
        var _this = this;
        var virtualListElm = this.virtualListRef.current;
        this.subs.add(this.props.options$
            .pipe(tap(function (options) {
            if (options.height === undefined) {
                throw new Error('Vist needs a height property in options$');
            }
        }), map(function (options) {
            var opt = Object.assign({}, options);
            opt.sticky = opt.sticky === undefined ? true : opt.sticky;
            opt.spare = opt.spare === undefined ? 3 : opt.spare;
            opt.startIndex = opt.startIndex === undefined ? 0 : opt.startIndex;
            opt.resize = opt.resize === undefined ? true : opt.resize;
            return opt;
        }))
            .subscribe(function (opt) { return _this.options$.next(opt); }));
        // window resize
        this.subs.add(fromEvent(window, 'resize')
            .pipe(withLatestFrom(this.options$), skipWhile(function (_a) {
            var _ = _a[0], options = _a[1];
            return !options.resize;
        }), startWith(null), debounceTime(200), map(function () { return _this.containerHeight$.next(virtualListElm.clientHeight); }))
            .subscribe());
        // scroll events
        var scrollEvent$ = fromEvent(virtualListElm, 'scroll').pipe(startWith({ target: { scrollTop: this.lastScrollPos } }));
        // scroll top
        var scrollTop$ = scrollEvent$.pipe(map(function (e) { return e.target.scrollTop; }));
        // scroll to the given position
        this.subs.add(this.options$
            .pipe(filter(function (option) { return option.startIndex !== undefined; }), map(function (option) { return option.startIndex * option.height; })
        // setTimeout to make sure the list is already rendered
        )
            .subscribe(function (scrollTop) { return setTimeout(function () { return virtualListElm.scrollTop = scrollTop; }); }));
        // let the scroll bar stick the top
        this.subs.add(this.props.data$
            .pipe(withLatestFrom(this.options$), filter(function (_a) {
            var _ = _a[0], options = _a[1];
            return Boolean(options.sticky);
        }))
            .subscribe(function () { return setTimeout(function () { return virtualListElm.scrollTop = 0; }); }));
        // scroll direction Down/Up
        var scrollDirection$ = scrollTop$.pipe(pairwise(), map(function (_a) {
            var p = _a[0], n = _a[1];
            return (n - p > 0 ? 1 : -1);
        }), startWith(1));
        // actual rows
        var actualRows$ = combineLatest(this.containerHeight$, this.options$).pipe(map(function (_a) {
            var ch = _a[0], option = _a[1];
            return Math.ceil(ch / option.height) + (option.spare || 3);
        }));
        // data indexes in view
        var indexes$ = combineLatest(scrollTop$, this.options$).pipe(
        // the index of the top elements of the current list
        map(function (_a) {
            var st = _a[0], options = _a[1];
            return Math.floor(st / options.height);
        }));
        // if it's necessary to update the view
        var shouldUpdate$ = combineLatest(indexes$, this.props.data$, actualRows$).pipe(map(function (_a) {
            var curIndex = _a[0], data = _a[1], actualRows = _a[2];
            // the first index of the virtualList on the last screen, if < 0, reset to 0
            var maxIndex = data.length - actualRows < 0 ? 0 : data.length - actualRows;
            return [Math.min(curIndex, maxIndex), actualRows];
        }), 
        // if the index or actual rows changed, then update
        filter(function (_a) {
            var curIndex = _a[0], actualRows = _a[1];
            return curIndex !== _this.lastFirstIndex || actualRows !== _this.actualRowsSnapshot;
        }), 
        // update the index
        tap(function (_a) {
            var curIndex = _a[0];
            return (_this.lastFirstIndex = curIndex);
        }), map(function (_a) {
            var firstIndex = _a[0], actualRows = _a[1];
            var lastIndex = firstIndex + actualRows - 1;
            return [firstIndex, lastIndex];
        }));
        // data slice in the view
        var dataInViewSlice$ = combineLatest(this.props.data$, this.options$, shouldUpdate$).pipe(withLatestFrom(scrollDirection$, actualRows$), map(function (_a) {
            var _b = _a[0], data = _b[0], options = _b[1], _c = _b[2], firstIndex = _c[0], lastIndex = _c[1], dir = _a[1], actualRows = _a[2];
            var dataSlice = _this.stateDataSnapshot;
            // compare data reference, if not the same, then update the list
            var dataReferenceIsSame = data === _this.dataReference;
            // fill the list
            if (!dataSlice.length || !dataReferenceIsSame || actualRows !== _this.actualRowsSnapshot) {
                if (!dataReferenceIsSame) {
                    _this.dataReference = data;
                }
                if (actualRows !== _this.actualRowsSnapshot) {
                    _this.actualRowsSnapshot = actualRows;
                }
                return (_this.stateDataSnapshot = data.slice(firstIndex, lastIndex + 1).map(function (item) { return ({
                    origin: item,
                    $pos: firstIndex * options.height,
                    $index: firstIndex++
                }); }));
            }
            // reuse the existing elements
            var diffSliceIndexes = _this.getDifferenceIndexes(dataSlice, firstIndex, lastIndex);
            var newIndex = dir > 0 ? lastIndex - diffSliceIndexes.length + 1 : firstIndex;
            diffSliceIndexes.forEach(function (index) {
                var item = dataSlice[index];
                item.origin = data[newIndex];
                item.$pos = newIndex * options.height;
                item.$index = newIndex++;
            });
            return (_this.stateDataSnapshot = dataSlice);
        }));
        // total height of the virtual list
        var scrollHeight$ = combineLatest(this.props.data$, this.options$).pipe(map(function (_a) {
            var data = _a[0], option = _a[1];
            return data.length * option.height;
        }));
        // subscribe to update the view
        this.subs.add(combineLatest(dataInViewSlice$, scrollHeight$).subscribe(function (_a) {
            var data = _a[0], scrollHeight = _a[1];
            return _this.setState({ data: data, scrollHeight: scrollHeight });
        }));
    };
    VirtualList.prototype.componentWillUnmount = function () {
        this.subs.unsubscribe();
        this.containerHeight$.complete();
        this.options$.complete();
    };
    VirtualList.prototype.render = function () {
        var _this = this;
        return (createElement("div", { className: style.VirtualList, ref: this.virtualListRef, style: this.props.style },
            createElement("div", { className: style.VirtualListContainer, style: { height: this.state.scrollHeight } }, this.state.data.map(function (data, i) { return (createElement("div", { key: i, className: style.VirtualListPlaceholder, style: { top: data.$pos + 'px' } }, data.origin !== undefined ? _this.props.children(data.origin, data.$index) : null)); }))));
    };
    VirtualList.prototype.getDifferenceIndexes = function (slice, firstIndex, lastIndex) {
        var indexes = [];
        slice.forEach(function (item, i) {
            if (item.$index < firstIndex || item.$index > lastIndex) {
                indexes.push(i);
            }
        });
        return indexes;
    };
    return VirtualList;
}(Component));

export { VirtualList };
//# sourceMappingURL=index.es.js.map

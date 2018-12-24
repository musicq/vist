'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var React = require('react');
var rxjs = require('rxjs');
var operators = require('rxjs/operators');

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
        // record the data in state
        _this.stateData = [];
        // record data reference
        _this.dataReference = [];
        // container dom instance
        _this.virtualListRef = React.createRef();
        // container height
        _this.containerHeight$ = new rxjs.BehaviorSubject(0);
        // last first index of data for the first element of the virtual list
        _this.lastFirstIndex = -1;
        // record the position of last scroll
        _this.lastScrollPos = 0;
        _this._subs = [];
        return _this;
    }
    VirtualList.prototype.componentDidMount = function () {
        var _this = this;
        var virtualListElm = this.virtualListRef.current;
        this.containerHeight$.next(virtualListElm.clientHeight);
        // scroll events
        this.scrollWin$ = rxjs.fromEvent(virtualListElm, 'scroll').pipe(operators.startWith({ target: { scrollTop: this.lastScrollPos } }));
        // scroll direction Down/Up
        var scrollDirection$ = this.scrollWin$.pipe(operators.map(function (e) { return e.target.scrollTop; }), operators.map(function (scrollTop) {
            var dir = scrollTop - _this.lastScrollPos;
            _this.lastScrollPos = scrollTop;
            return dir > 0 ? 1 : -1;
        }));
        // actual rows
        var actualRows$ = rxjs.combineLatest(this.containerHeight$, this.props.options$).pipe(operators.map(function (_a) {
            var ch = _a[0], option = _a[1];
            return Math.ceil(ch / option.height) + (option.spare || 3);
        }));
        // let the scroll bar stick the top
        this._subs.push(this.props.data$.pipe(operators.withLatestFrom(this.props.options$))
            .subscribe(function (_a) {
            var _ = _a[0], options = _a[1];
            if (options.resetOnDataChange) {
                virtualListElm.scrollTo(0, 0);
            }
        }));
        // if it's necessary to update the view
        var shouldUpdate$ = rxjs.combineLatest(this.scrollWin$.pipe(operators.map(function () { return virtualListElm.scrollTop; })), this.props.options$, this.props.data$, actualRows$).pipe(
        // the index of the top elements of the current list
        operators.map(function (_a) {
            var st = _a[0], options = _a[1], data = _a[2], actualRows = _a[3];
            var curIndex = Math.floor(st / options.height);
            // the first index of the virtualList on the last screen, if < 0, reset to 0
            var maxIndex = data.length - actualRows < 0 ? 0 : data.length - actualRows;
            return curIndex > maxIndex ? maxIndex : curIndex;
        }), 
        // if the index changed, then update
        operators.filter(function (curIndex) { return curIndex !== _this.lastFirstIndex; }), 
        // update the index
        operators.tap(function (curIndex) { return _this.lastFirstIndex = curIndex; }), operators.withLatestFrom(actualRows$), operators.map(function (_a) {
            var firstIndex = _a[0], actualRows = _a[1];
            var lastIndex = firstIndex + actualRows - 1;
            return [firstIndex, lastIndex];
        }));
        // data slice in the view
        var dataInViewSlice$ = rxjs.combineLatest(this.props.data$, this.props.options$, shouldUpdate$).pipe(operators.withLatestFrom(scrollDirection$), operators.map(function (_a) {
            var _b = _a[0], data = _b[0], options = _b[1], _c = _b[2], firstIndex = _c[0], lastIndex = _c[1], dir = _a[1];
            var dataSlice = _this.stateData;
            // compare data reference, if not the same, then update the list
            var dataReferenceIsSame = data === _this.dataReference;
            // fill the list
            if (!dataSlice.length || !dataReferenceIsSame) {
                if (!dataReferenceIsSame) {
                    _this.dataReference = data;
                }
                return _this.stateData = data.slice(firstIndex, lastIndex + 1).map(function (item) { return ({
                    origin: item,
                    $pos: firstIndex * options.height,
                    $index: firstIndex++
                }); });
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
            return _this.stateData = dataSlice;
        }));
        // total height of the virtual list
        var scrollHeight$ = rxjs.combineLatest(this.props.data$, this.props.options$).pipe(operators.map(function (_a) {
            var data = _a[0], option = _a[1];
            return data.length * option.height;
        }));
        // subscribe to update the view
        this._subs.push(rxjs.combineLatest(dataInViewSlice$, scrollHeight$)
            .subscribe(function (_a) {
            var data = _a[0], scrollHeight = _a[1];
            return _this.setState({ data: data, scrollHeight: scrollHeight });
        }));
    };
    VirtualList.prototype.componentWillUnmount = function () {
        this._subs.forEach(function (stream$) { return stream$.unsubscribe(); });
        this.containerHeight$.complete();
    };
    VirtualList.prototype.render = function () {
        var _this = this;
        return (React.createElement("div", { className: style.VirtualList, ref: this.virtualListRef, style: this.props.style },
            React.createElement("div", { className: style.VirtualListContainer, style: { height: this.state.scrollHeight } }, this.state.data.map(function (data, i) {
                return React.createElement("div", { key: i, className: style.VirtualListPlaceholder, style: { transform: "translateY(" + data.$pos + "px)" } }, data.origin ? _this.props.children(data.origin) : null);
            }))));
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
}(React.Component));

exports.VirtualList = VirtualList;
//# sourceMappingURL=index.js.map

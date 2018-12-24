import React, { Component } from 'react';
import { BehaviorSubject, combineLatest, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { VirtualList } from 'vist';

const data = new Array(5000).fill(0).map((_, i) => i);

class App extends Component {
  state = {
    data: new BehaviorSubject([]),
    keyWord: ''
  };
  search$ = new BehaviorSubject(this.state.keyWord);
  data$ = of(data);

  constructor(props) {
    super(props);

    this.onSearch = this.onSearch.bind(this);
  }

  componentDidMount() {
    combineLatest(this.data$, this.search$).pipe(
      tap(([data, keyWord]) => this.setState({ keyWord })),
      map(([data, keyWord]) => data.filter(item => item.toString().includes(keyWord)))
    ).subscribe(data => this.state.data.next(data));
  }

  onSearch(e) {
    this.search$.next(e.target.value);
  }

  render() {
    return (
      <div>
        <div className="input-box">
          <label>
            <h1>Please enter a number<br/>(0 - 5000)</h1>
            <br/>
            <input
              placeholder="Try to enter a number"
              autoFocus
              type="text"
              onChange={this.onSearch}
              value={this.state.keyWord}/>
          </label>
        </div>

        <div className="virtual-box">
          <VirtualList
            data$={this.state.data}
            options$={of({ height: 60, resetOnDataChange: true })}
            style={{ height: 400 }}
          >
            {item => (
              <p style={{ height: 59 }}>
                No. {item}
              </p>
            )}
          </VirtualList>
        </div>
      </div>
    );
  }
}

export default App;

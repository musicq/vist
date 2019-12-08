import React, { Component } from 'react';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { VirtualList } from 'vist';

class App extends Component {
  state = {
    data: new BehaviorSubject([]),
    keyWord: ''
  };
  search$ = new BehaviorSubject(this.state.keyWord);
  data$ = new BehaviorSubject([]);
  options$ = new BehaviorSubject({ height: 180, startIndex: 3000 });

  constructor(props) {
    super(props);

    this.onSearch = this.onSearch.bind(this);
  }

  componentDidMount() {
    fetch('https://jsonplaceholder.typicode.com/photos')
      .then(res => res.json())
      .then(data => {
        this.data$.next(data);
        this.options$.next({ height: 180, startIndex: 3000 });
      })
      .catch(console.error);

    combineLatest([this.data$, this.search$]).pipe(
      tap(([data, keyWord]) => this.setState({ keyWord })),
      map(([data, keyWord]) => data.filter(item => {
        if (Number.isNaN(+keyWord)) {
          return item.title.includes(keyWord);
        }

        return item.id.toString().includes(keyWord);
      }) || [])
    ).subscribe(data => this.state.data.next(data));
  }

  onSearch(e) {
    this.search$.next(e.target.value);
  }

  render() {
    return (
      <div className="container">
        <div className="input-box">
          <input
            placeholder="Type to search..."
            autoFocus
            type="text"
            onChange={this.onSearch}
            value={this.state.keyWord}/>
        </div>

        <div className="virtual-box">
          <VirtualList
            data$={this.state.data}
            options$={this.options$}
            style={{ height: '70vh' }}
            className="custom-class"
            keepDom={false}
            uniqKey="id"
          >
            {item => (
              <div className="card">
                <a href={item.url}>
                  <div className="thumbnail">
                    <img src={item.thumbnailUrl} alt={item.title}/>
                  </div>
                  <div className="content">
                    <p>{item.title}</p>
                    <p>No.{item.id}</p>
                  </div>
                </a>
              </div>
            )}
          </VirtualList>
        </div>
      </div>
    );
  }
}

export default App;

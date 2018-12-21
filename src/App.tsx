import React, { Component } from 'react';
import { of } from 'rxjs';
import { VirtualList } from './virtual-list/VirtualList';

class App extends Component {
  constructor(props: any) {
    super(props);

    const data = new Array(100).fill(0).map((_, i) => i);

    this.state = {
      data: of(data)
    };
  }

  render() {
    return (
      <VirtualList
        data$={(this.state as any).data}
        options$={of({ height: 60 })}
        style={{ height: 400, border: '1px solid black' }}
      >
        {(item: any) => (
          <p style={{ height: 59, margin: 0, borderBottom: '1px solid green' }}>
            No. {item}
          </p>
        )}
      </VirtualList>
    );
  }
}

export default App;

# vist

> Virtual-list component build with react and rxjs

[![NPM](https://img.shields.io/npm/v/vist.svg)](https://www.npmjs.com/package/vist)

## Selling Point

Vist won't create or remove any DOM when you scroll the list, it will reuse the existing DOM and only change their position and data. But when you resize your window, you'll find the DOM's number is changed, so your virtual list will always have just right number of DOM.

## Install

```bash
npm install --save vist
```

## Usage

```javascript
import React from 'react';
import { VirtualList } from 'vist';

class App extends Component {
  constructor(props) {
    super(props);

    const data = new Array(5000).fill(0).map((_, i) => i);

    this.state = {
      data: of(data)
    };
  }

  render() {
    return (
      <VirtualList
        data$={this.state.data}
        options$={of({ height: 60 })}
        style={{ height: 400, border: '1px solid black' }}>
        {(item, index) => (
          <p style={{ height: 59, margin: 0, borderBottom: '1px solid green' }}>
            No. {index} - {item}
          </p>
        )}
      </VirtualList>
    );
  }
}
```

## Props

| Property    | Type                              | Description                         |
| ----------- | --------------------------------- | ----------------------------------- |
| `data$`     | `Observable<any>`                 | Data source of the list.            |
| `options$`  | `Observable<IVirtualListOptions>` | Options of the virtual list.        |
| `style`     | `{[key: string]: string|number}`  | Style of VirtualList container.     |
| `className` | `string`                          | className of VirtualList container. |
| `keepDom`   | `boolean`                         | Determine whether to reuse the dom. |
| `uniqKey`   | `string`                          | The key field of list to identify.  |

### `IVirtualListOptions`

| Property     | Type      | Default      | Description                                                                                                     |
| ------------ | --------- | ------------ | --------------------------------------------------------------------------------------------------------------- |
| `height`     | `number`  | **NOT NULL** | Item height, it's **necessary**, vist use this property to calculate how many rows should be rendered actually. |
| `spare`      | `number`  | 3            | Spare rows out of the view.                                                                                     |
| `sticky`     | `boolean` | true         | Whether the scrollTop need to stick to the container's top when the data is changed or not.                     |
| `startIndex` | `number`  | 0            | To indicate this start index of the list, and the list will scroll to this start index position when mounted.   |
| `resize`     | `boolean` | true         | To mark if the real dom number should be recomputed when the window resize.                                     |

## License

MIT © [musicq](https://github.com/musicq)

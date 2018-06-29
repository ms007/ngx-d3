# BubbleChart
An animated bubble chart component with optional pictures, displaying all changes with smooth transitions.

The library has been developed with Angular 6. It should work with older versions of Angular too, but this isn't tested yet.

This repository is maintained by volunteers of [OPITZ CONSULTING Deutschland GmbH](https://www.opitz-consulting.com).


There is a demo component `BubbleChartDemoComponent` in this repository at https://github.com/opitzconsulting/ngx-d3.

```bash
npm install @opitzconsulting/bubble-chart
```

In your application root module definition add `BubbleChartModule`.
```typescript
import { BubbleChartModule } from '@opitzconsulting/bubble-chart';
@NgModule({
  bootstrap: [ /* ... */ ],
  declarations: [ /* ... */ ],
  imports: [
    /* ... */
    BubbleChartModule
  ]
})
export class AppModule {}
```

In your components template add `oc-bubble-chart` tag.
```html
<oc-bubble-chart [data]="bubbleChartData" width="250" height="250"></oc-bubble-chart>
```

In your component class you can declare the data:
```typescript
import { BubbleChartData } from 'oc-bubble-chart';
/* ... */
public bubbleChartData: Array<BubbleChartData>: Array<BubbleChartData> = [
  { caption: 'apples', value: 10, color: 'green', imagePath: './assets/pathToImage.png' },
  { caption: 'oranges', value: 20, color: 'orange' },
  { caption: 'bananas', value: 30, color: 'yellow' }
];
```

**Properties:**
- `data` (`Array<BubbleChartData>`) - Array of entries with caption and value. A fixed color can also be specified optional. An image could be displayed by define imagePath-Property.
- `width` (`number`) - The chart width in pixel (default 500).
- `height` (`number`) - The chart height in pixel (default 500).
- `duration` (`number`) - The duration of any animations in milliseconds (default 1000).

**Events**
- `chartClick`: fires when click on a chart has occured, returns regarding chart entry.
- `chartHover`: fires when mouseover (hover) on a chart has occured, returns regarding chart entry.

**License**

This implementation is released unter the Apache License v2.

The library is based on [D3.js](https://github.com/d3), which has been published under an BSD 3-Clause "New" or "Revised" License.
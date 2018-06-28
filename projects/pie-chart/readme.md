# PieChart
An animated pie chart component, displaying all changes with smooth transitions.

The library has been developed with Angular 6. It should work with older versions of Angular too, but this isn't tested yet.

This repository is maintained by volunteers of [OPITZ CONSULTING Deutschland GmbH](https://www.opitz-consulting.com).


There is a demo component `PieChartDemoComponent` in this repository at https://github.com/opitzconsulting/ngx-d3.

```bash
npm install @opitzconsulting/pie-chart
```

In your application root module definition add `PieChartModule`.
```typescript
import { PieChartModule } from '@opitzconsulting/pie-chart';
@NgModule({
  bootstrap: [ /* ... */ ],
  declarations: [ /* ... */ ],
  imports: [
    /* ... */
    PieChartModule
  ]
})
export class AppModule {}
```

In your components template add `oc-pie-chart` tag.
```html
<oc-pie-chart [data]="pieChartData" width="250" height="250"></oc-pie-chart>
```

In your component class you can declare the data:
```typescript
import { PieChartData } from 'oc-pie-chart';
/* ... */
public pieChartData: Array<PieChartData>: Array<PieChartData> = [
  { caption: 'apples', value: 10, color: 'green' },
  { caption: 'oranges', value: 20, color: 'orange' },
  { caption: 'bananas', value: 30, color: 'yellow' }
];
```

**Properties:**
- `data` (`Array<PieChartData>`) - Array of chart entries with caption and value. A fixed color can also be specified optional.
- `width` (`number`) - The chart width in pixel (default 250).
- `height` (`number`) - The chart height in pixel (default 250).
- `duration` (`number`) - The duration of any animations in milliseconds (default 1000).
- `innerSpacing` (`number`) - The chart spacing from the middle corner in pixel (default 0).
- `outerSpacing` (`number`) - The chart margin in pixel (default 1).

**Events**
- `chartClick`: fires when click on a chart has occured, returns regarding chart entry.
- `chartHover`: fires when mouseover (hover) on a chart has occured, returns regarding chart entry.

**License**

This implementation is released unter the Apache License v2.

The library is based on [D3.js](https://github.com/d3), which has been published under an BSD 3-Clause "New" or "Revised" License.
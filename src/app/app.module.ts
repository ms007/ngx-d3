import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './/app-routing.module';
import { PieChartModule } from '../../projects/pie-chart/src/lib/pie-chart.module';
import { SegmentedBarChartModule } from 'projects/segmented-bar-chart/src/public_api';
import { BubbleChartModule } from '../../projects/bubble-chart/src/lib/bubble-chart.module';
import { PieChartDemoComponent } from './pie-chart-demo/pie-chart-demo.component';
import { BubbleChartDemoComponent } from './bubble-chart-demo/bubble-chart-demo.component';
import { SegmentedBarChartDemoComponent } from './segmented-bar-chart-demo/segmented-bar-chart-demo.component';

@NgModule({
  declarations: [
    AppComponent, 
    PieChartDemoComponent, 
    BubbleChartDemoComponent, 
    SegmentedBarChartDemoComponent
  ],
  imports: [
    BrowserModule, 
    AppRoutingModule,
    PieChartModule, 
    BubbleChartModule,
    SegmentedBarChartModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}

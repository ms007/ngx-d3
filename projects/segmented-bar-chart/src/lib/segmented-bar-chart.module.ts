import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { SegmentedBarChartComponent } from './segmented-bar-chart.component';

@NgModule({
  imports: [
    BrowserModule
  ],
  declarations: [SegmentedBarChartComponent],
  exports: [SegmentedBarChartComponent]
})
export class SegmentedBarChartModule { }

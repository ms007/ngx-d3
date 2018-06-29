import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BubbleChartComponent } from './bubble-chart.component';

@NgModule({
  imports: [
    BrowserModule
  ],
  declarations: [BubbleChartComponent],
  exports: [BubbleChartComponent]
})
export class BubbleChartModule { }

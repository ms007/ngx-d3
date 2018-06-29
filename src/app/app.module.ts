import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { PieChartModule } from '../../projects/pie-chart/src/lib/pie-chart.module';
import { BubbleChartModule } from '../../projects/bubble-chart/src/lib/bubble-chart.module';
import { PieChartDemoComponent } from './pie-chart-demo/pie-chart-demo.component';
import { BubbleChartDemoComponent } from './bubble-chart-demo/bubble-chart-demo.component';
import { AppRoutingModule } from './/app-routing.module';

@NgModule({
  declarations: [
    AppComponent, 
    PieChartDemoComponent, 
    BubbleChartDemoComponent
  ],
  imports: [
    BrowserModule, 
    AppRoutingModule,
    PieChartModule, 
    BubbleChartModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}

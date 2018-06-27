import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { PieChartModule } from '../../projects/pie-chart/src/lib/pie-chart.module';
import { PieChartDemoComponent } from './pie-chart-demo/pie-chart-demo.component';

@NgModule({
  declarations: [
    AppComponent, 
    PieChartDemoComponent
  ],
  imports: [
    BrowserModule, 
    PieChartModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}

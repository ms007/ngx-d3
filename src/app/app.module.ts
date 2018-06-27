import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { PieChartModule } from 'pie-chart';
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

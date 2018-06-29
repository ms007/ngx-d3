import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { PieChartDemoComponent } from './pie-chart-demo/pie-chart-demo.component';
import { BubbleChartDemoComponent } from './bubble-chart-demo/bubble-chart-demo.component';

export const routes: Routes = [
  { path: 'pie-chart', component: PieChartDemoComponent },
  { path: 'bubble-chart', component: BubbleChartDemoComponent }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forRoot(routes)
  ],
  exports: [
    RouterModule
  ],
  declarations: []
})
export class AppRoutingModule { }

import { Component, OnInit } from '@angular/core';
import { PieChartData } from '../../../projects/pie-chart/src/lib/pie-chart.component';

@Component({
  selector: 'app-pie-chart-demo',
  templateUrl: './pie-chart-demo.component.html',
  styleUrls: ['./pie-chart-demo.component.css']
})
export class PieChartDemoComponent implements OnInit {
  /** maximal value of one item */
  private readonly maxValue = 100000;
  /** maximal number of changed items at once */
  private readonly maxChanges = 10;
  /** internal counter for item captions */
  private counter = 0;
  /** pie chart data array */
  public pieChartData: Array<PieChartData> = [];

  constructor() { }

  ngOnInit() {
    // fill chart data with random items
    this.addRandomItems();
  }

  /**
   * returns random number between min and max
   * @param min 
   * @param max 
   */
  private randomInt(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min));
  };

  /**
   * returns random existing pie chart data index
   */
  private randomIdx(): number {
    return this.randomInt(0, this.pieChartData.length-1);
  };

  /**
   * set a random item value to a random number
   */
  public changeRandomValue(): void {
    const idx = this.randomIdx();
    const oldValue = this.pieChartData[idx].value;
    const newValue = this.randomInt(0, this.maxValue);
    this.pieChartData[idx].value = newValue;
    console.log('changed value for item with index:%o oldValue:%o newValue:%o',idx,oldValue,newValue);
  };

  /**
   * sets random item values to random numbers
   */
  public changeRandomValues(): void {
    const count = this.randomInt(1, this.maxChanges);
    for(let i=0; i<count; ++i){
      this.changeRandomValue();
    }
  };

  /**
   * removes a random item
   */
  public removeRandomItem(): void {
    const idx = this.randomIdx();
    const item = this.pieChartData.splice(idx, 1)[0];
    console.log('removed item with index:%o item:%o',idx,item);
  };

  /**
   * removes random items
   */
  public removeRandomItems(): void {
    const count = this.randomInt(1, this.maxChanges);
    for(let i=0; i<count; ++i){
      this.removeRandomItem();
    }
  };

  /**
   * adds a random item with random value
   */
  public addRandomItem(): void {
    const idx = this.randomInt(0, this.pieChartData.length);
    const item: PieChartData = {
      caption: '#'+(++this.counter),
      value: this.randomInt(0, this.maxValue)
    };
    this.pieChartData.splice(idx, 0, item);
    console.log('added item at index:%o item:%o',idx,item);
  };

  /**
   * adds random items with random values
   */
  public addRandomItems(): void {
    const count = this.randomInt(1, this.maxChanges);
    for(let i=0; i<count; ++i){
      this.addRandomItem();
    }
  };

  /**
   * moves a random item
   */
  public moveRandomItem(): void {
    const oldIdx = this.randomIdx();
    const newIdx = this.randomIdx();
    const item = this.pieChartData.splice(oldIdx, 1)[0];
    this.pieChartData.splice(newIdx, 0, item);
    console.log('moved item from index:%o to index:%o item:%o',oldIdx,newIdx,item); 
  };

  /**
   * moves random items
   */
  public moveRandomItems(): void {
    const count = this.randomInt(1, this.maxChanges);
    for(let i=0; i<count; ++i){
      this.moveRandomItem();
    }
  };

  /**
   * change colors of all items
   */
  public changeColors(): void {
    // only delete color property to assign new random color
    for(let item of this.pieChartData){
      delete item.color;
    }
  };

  /**
   * fired when user clicks on a chart item
   * @param item 
   */
  public chartClicked(item: PieChartData) {
    console.log('clicked item:%o', item);
  };

  /**
   * fired when user hovers a chart item
   * @param item 
   */
  public chartHovered(item: PieChartData) {
    console.log('hovered item:%o', item);
  };

}
import { Component, OnInit } from '@angular/core';
import { BubbleChartData } from 'projects/bubble-chart/src/public_api';

@Component({
  selector: 'app-bubble-chart-demo',
  templateUrl: './bubble-chart-demo.component.html',
  styleUrls: ['./bubble-chart-demo.component.css']
})
export class BubbleChartDemoComponent implements OnInit {
  /** maximal value of one item */
  private readonly maxValue = 100;
  /** maximal number of changed items at once */
  private readonly maxChanges = 10;
  /** internal counter for item captions */
  private counter = 0;
  /** chart width */
  public chartWidth = 500;
  /** chart height */
  public chartHeight = 500;
  /** bubble chart data array */
  public data: BubbleChartData[] = [];

  constructor() { }

  ngOnInit() {
    // fill chart data with random items
    this.addRandomItems();
  };

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
    return this.randomInt(0, this.data.length-1);
  };

  /**
   * set a random item value to a random number
   */
  public changeRandomValue(): void {
    const idx = this.randomIdx();
    const oldValue = this.data[idx].value;
    const newValue = this.randomInt(0, this.maxValue);
    this.data[idx].value = newValue;
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
   * moves a random item
   */
  public moveRandomItem(): void {
    const oldIdx = this.randomIdx();
    const newIdx = this.randomIdx();
    const item = this.data.splice(oldIdx, 1)[0];
    this.data.splice(newIdx, 0, item);
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
   * adds a random item with random value
   */
  public addRandomItem(): void {
    const idx = this.randomInt(0, this.data.length);
    const item: BubbleChartData = {
      caption: '#'+(++this.counter),
      value: this.randomInt(0, this.maxValue)
    };
    this.data.splice(idx, 0, item);
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
   * removes a random item
   */
  public removeRandomItem(): void {
    const idx = this.randomIdx();
    const item = this.data.splice(idx, 1)[0];
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
   * set chart dimension to fit in window
   */
  public resize(): void {
    const offsetY = 200;
    const winHeight = window.innerHeight;
    const winWidth = window.innerWidth;
    this.chartWidth = winWidth - 80;
    this.chartHeight = winHeight - offsetY - 80;
  };

  /**
   * change colors of all items
   */
  public changeColors(): void {
    // only delete color property to assign new random color
    for(let item of this.data){
      delete item.color;
    }
  };

  /**
   * fired when user clicks on a bubble
   * @param item 
   */
  public chartClicked(item: BubbleChartData) {
    console.log('clicked item:%o', item);
  };

  /**
   * fired when user hovers a bubble
   * @param item 
   */
  public chartHovered(item: BubbleChartData) {
    console.log('hovered item:%o', item);
  };
}
